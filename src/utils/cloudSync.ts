/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { ShopStorage, isSampleRecord } from './storage';
import { 
  Product, 
  Sale, 
  Contact, 
  Professional, 
  Category, 
  Purchase, 
  Payment, 
  Expense, 
  MaterialEstimate,
  SyncDiagnosticInfo 
} from '../types';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  shopName: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
export type AuthState = 'initializing' | 'signedOut' | 'loadingAccount' | 'ready' | 'error';

type SyncListener = (status: SyncStatus, lastSync: string | null, error?: string) => void;
type AuthListener = (user: UserProfile | null, authState: AuthState) => void;

class CloudSyncService {
  private syncListeners: SyncListener[] = [];
  private authListeners: AuthListener[] = [];
  private currentStatus: SyncStatus = 'idle';
  private authStatus: AuthState = 'initializing';
  private currentError: string | null = null;
  private currentUser: UserProfile | null = null;
  private unsubscribes: Unsubscribe[] = [];
  private onDataUpdatedCallback: (() => void) | null = null;
  private pendingWritesCount: number = 0;
  private initialHydrationComplete: boolean = false;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isApplyingRemoteUpdate: boolean = false;
  private currentMutationHandler: ((action: 'upsert' | 'delete', col: string, id: string, data?: any) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (this.currentUser) {
          this.notify('synced');
        }
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify('offline', 'Device is offline. Changes saved locally.');
      });

      // Single authoritative Firebase Auth-State observer
      onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (firebaseUser) {
          this.authStatus = 'loadingAccount';
          this.notifyAuthChange();

          const profile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Shop Owner',
            shopName: localStorage.getItem(`ak_${firebaseUser.uid}_shop_name`) || localStorage.getItem('ak_shop_name') || 'Hardware & Paints Store',
          };
          this.currentUser = profile;

          // Scope local storage strictly to this authenticated UID
          ShopStorage.setActiveNamespace(firebaseUser.uid);

          // Perform initial hydration from cloud
          await this.hydrateFromCloud(firebaseUser.uid);

          // Hook local storage mutations to Firestore single-doc writes
          this.currentMutationHandler = (action, col, id, data) => {
            this.handleLocalMutation(firebaseUser.uid, action, col, id, data);
          };
          ShopStorage.registerMutationListener(this.currentMutationHandler);

          // Attach real-time Firestore listeners for multi-device live sync
          this.attachLiveListeners(firebaseUser.uid);

          this.authStatus = 'ready';
          this.notifyAuthChange();
          this.recordSyncTime();
          this.notify('synced');
        } else {
          this.detachLiveListeners();
          this.currentMutationHandler = null;
          ShopStorage.registerMutationListener(null);
          this.currentUser = null;
          ShopStorage.setActiveNamespace(null);
          this.initialHydrationComplete = false;
          this.authStatus = 'signedOut';
          this.notifyAuthChange();
          this.notify('idle');
          this.triggerDataUpdate();
        }
      });
    }
  }

  // --- Auth & Sync Listeners ---
  public subscribeAuth(listener: AuthListener): () => void {
    this.authListeners.push(listener);
    listener(this.currentUser, this.authStatus);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }

  public subscribe(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    listener(this.currentStatus, this.getLastSyncTime(), this.currentError || undefined);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  public registerDataUpdateListener(cb: () => void) {
    this.onDataUpdatedCallback = cb;
  }

  private notify(status: SyncStatus, error?: string) {
    this.currentStatus = status;
    this.currentError = error || null;
    const lastSync = this.getLastSyncTime();
    this.syncListeners.forEach(listener => listener(status, lastSync, error));
  }

  private notifyAuthChange() {
    this.authListeners.forEach(listener => listener(this.currentUser, this.authStatus));
  }

  public getAuthStatus(): AuthState {
    return this.authStatus;
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public isLoggedIn(): boolean {
    return Boolean(this.currentUser && auth.currentUser);
  }

  public getUser(): UserProfile | null {
    return this.currentUser;
  }

  public getLastSyncTime(): string | null {
    try {
      const uid = this.currentUser?.id;
      return uid ? localStorage.getItem(`ak_${uid}_last_sync`) : null;
    } catch {
      return null;
    }
  }

  private recordSyncTime() {
    try {
      const uid = this.currentUser?.id;
      if (uid) {
        localStorage.setItem(`ak_${uid}_last_sync`, new Date().toISOString());
      }
    } catch {}
  }

  public isAutoSyncEnabled(): boolean {
    try {
      const uid = this.currentUser?.id;
      const key = uid ? `ak_${uid}_auto_sync` : 'ak_auto_sync';
      return localStorage.getItem(key) !== 'false';
    } catch {
      return true;
    }
  }

  public setAutoSyncEnabled(enabled: boolean): void {
    try {
      const uid = this.currentUser?.id;
      const key = uid ? `ak_${uid}_auto_sync` : 'ak_auto_sync';
      localStorage.setItem(key, String(enabled));
    } catch {}
  }

  // --- Initial Cloud Hydration ---
  private async hydrateFromCloud(uid: string): Promise<void> {
    try {
      this.notify('syncing');

      // Helper to fetch collection
      const fetchCol = async <T>(colName: string): Promise<T[]> => {
        try {
          const snap = await getDocs(collection(db, 'users', uid, colName));
          const list: T[] = [];
          snap.forEach(d => list.push(d.data() as T));
          return list;
        } catch (e) {
          console.warn(`Hydration read failed for ${colName}:`, e);
          return [];
        }
      };

      const [products, sales, contacts, purchases, payments, expenses, estimates, professionals, categories] = await Promise.all([
        fetchCol<Product>('products'),
        fetchCol<Sale>('sales'),
        fetchCol<Contact>('contacts'),
        fetchCol<Purchase>('purchases'),
        fetchCol<Payment>('payments'),
        fetchCol<Expense>('expenses'),
        fetchCol<MaterialEstimate>('estimates'),
        fetchCol<Professional>('professionals'),
        fetchCol<Category>('categories'),
      ]);

      // If cloud has business data, load it as authoritative
      const totalDocs = products.length + sales.length + contacts.length + purchases.length + categories.length;
      if (totalDocs > 0) {
        ShopStorage.loadCustomData({
          products,
          sales,
          contacts,
          purchases,
          payments,
          expenses,
          estimates,
          professionals,
          categories,
        });
      } else {
        // Genuinely empty cloud account
        ShopStorage.init();
      }

      // Fetch user profile & settings
      try {
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data?.shopName && this.currentUser) {
            this.currentUser.shopName = data.shopName;
            localStorage.setItem(`ak_${uid}_shop_name`, data.shopName);
          }
        }

        const settingsSnap = await getDoc(doc(db, 'users', uid, 'settings', 'general'));
        if (settingsSnap.exists()) {
          const s = settingsSnap.data();
          if (s.shopName) localStorage.setItem(`ak_${uid}_shop_name`, s.shopName);
          if (s.shopAddress !== undefined) localStorage.setItem(`ak_${uid}_shop_address`, s.shopAddress);
          if (s.shopPhone !== undefined) localStorage.setItem(`ak_${uid}_shop_phone`, s.shopPhone);
          if (s.shopUpiId !== undefined) localStorage.setItem(`ak_${uid}_shop_upi_id`, s.shopUpiId);
          if (s.shopGstin !== undefined) localStorage.setItem(`ak_${uid}_shop_gstin`, s.shopGstin);
          if (s.shopState !== undefined) localStorage.setItem(`ak_${uid}_shop_state`, s.shopState);
          if (s.shopStateCode !== undefined) localStorage.setItem(`ak_${uid}_shop_state_code`, s.shopStateCode);
          if (s.invoicePrefix !== undefined) localStorage.setItem(`ak_${uid}_invoice_prefix`, s.invoicePrefix);
        }
      } catch (err) {
        console.warn('Settings hydration error:', err);
      }

      this.initialHydrationComplete = true;
      this.triggerDataUpdate();
      this.recordSyncTime();
      this.notify('synced');
    } catch (err: any) {
      console.error('Initial hydration failed:', err);
      this.notify('error', 'Cloud sync connection error: ' + (err?.message || 'Check network'));
    }
  }

  // --- Granular Local Mutation Handler ---
  private async handleLocalMutation(uid: string, action: 'upsert' | 'delete', col: string, id: string, data?: any): Promise<void> {
    if (!this.isOnline || !this.isLoggedIn()) return;

    this.pendingWritesCount++;
    try {
      const docRef = doc(db, 'users', uid, col, id);
      if (action === 'delete') {
        await deleteDoc(docRef);
      } else if (data) {
        await setDoc(docRef, data, { merge: true });
      }
      this.recordSyncTime();
      this.notify('synced');
    } catch (err: any) {
      console.warn(`Firestore mutation error on ${col}/${id}:`, err);
      this.notify('error', `Write failed: ${err?.message || 'Will retry when connection stabilizes'}`);
    } finally {
      this.pendingWritesCount = Math.max(0, this.pendingWritesCount - 1);
    }
  }

  // --- Real-time Snapshot Change Listeners ---
  private attachLiveListeners(uid: string) {
    this.detachLiveListeners();

    const collections = [
      'products', 'sales', 'contacts', 'purchases', 
      'payments', 'expenses', 'estimates', 'professionals', 'categories'
    ];

    collections.forEach((colName) => {
      const unsub = onSnapshot(collection(db, 'users', uid, colName), (snapshot) => {
        // Skip first empty snapshot during initial hydration
        if (!this.initialHydrationComplete) return;

        let hasChanges = false;
        snapshot.docChanges().forEach((change) => {
          hasChanges = true;
          const docId = change.doc.id;
          const docData = change.doc.data();

          if (change.type === 'removed') {
            // Document was deleted on another device or via sample cleanup
            this.applyLocalDeletion(colName, docId);
          } else if (change.type === 'added' || change.type === 'modified') {
            this.applyLocalUpsert(colName, docData);
          }
        });

        if (hasChanges) {
          this.triggerDataUpdate();
          this.recordSyncTime();
          this.notify('synced');
        }
      }, (err) => {
        console.warn(`Snapshot listener error on ${colName}:`, err);
        handleFirestoreError(err, OperationType.LIST, `users/${uid}/${colName}`);
      });

      this.unsubscribes.push(unsub);
    });

    // Settings listener
    const unsubSettings = onSnapshot(collection(db, 'users', uid, 'settings'), (snapshot) => {
      snapshot.forEach(d => {
        const data = d.data();
        if (data.shopName) localStorage.setItem(`ak_${uid}_shop_name`, data.shopName);
        if (data.shopAddress !== undefined) localStorage.setItem(`ak_${uid}_shop_address`, data.shopAddress);
        if (data.shopPhone !== undefined) localStorage.setItem(`ak_${uid}_shop_phone`, data.shopPhone);
        if (data.shopUpiId !== undefined) localStorage.setItem(`ak_${uid}_shop_upi_id`, data.shopUpiId);
        if (data.shopGstin !== undefined) localStorage.setItem(`ak_${uid}_shop_gstin`, data.shopGstin);
        if (data.shopState !== undefined) localStorage.setItem(`ak_${uid}_shop_state`, data.shopState);
        if (data.shopStateCode !== undefined) localStorage.setItem(`ak_${uid}_shop_state_code`, data.shopStateCode);
        if (data.invoicePrefix !== undefined) localStorage.setItem(`ak_${uid}_invoice_prefix`, data.invoicePrefix);
      });
      this.triggerDataUpdate();
    });
    this.unsubscribes.push(unsubSettings);
  }

  private applyLocalDeletion(colName: string, docId: string): void {
    // Delete silently in local storage without triggering recursive mutation callback
    const listener = this.currentMutationHandler;
    ShopStorage.registerMutationListener(null);
    try {
      if (colName === 'products') ShopStorage.deleteProduct(docId);
      else if (colName === 'contacts') ShopStorage.deleteContact(docId);
      else if (colName === 'expenses') ShopStorage.deleteExpense(docId);
      else if (colName === 'estimates') ShopStorage.deleteEstimate(docId);
      else if (colName === 'professionals') ShopStorage.deleteProfessional(docId);
    } finally {
      ShopStorage.registerMutationListener(listener);
    }
  }

  private applyLocalUpsert(colName: string, docData: any): void {
    const listener = this.currentMutationHandler;
    ShopStorage.registerMutationListener(null);
    try {
      if (colName === 'products') ShopStorage.saveProduct(docData as Product);
      else if (colName === 'contacts') ShopStorage.saveContact(docData as Contact);
      else if (colName === 'professionals') ShopStorage.saveProfessional(docData as Professional);
      else if (colName === 'categories') ShopStorage.saveCategory(docData as Category);
      else if (colName === 'estimates') ShopStorage.saveEstimate(docData as MaterialEstimate);
    } finally {
      ShopStorage.registerMutationListener(listener);
    }
  }

  private detachLiveListeners() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  private triggerDataUpdate() {
    if (this.onDataUpdatedCallback) {
      try {
        this.onDataUpdatedCallback();
      } catch {}
    }
  }

  // --- 1. Robust Authentication & Error Handling ---
  public async register(params: {
    email: string;
    password: string;
    name?: string;
    shopName?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = params.email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    this.notify('syncing');

    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
    } catch (authErr: any) {
      console.error('Firebase Auth Register Error:', authErr);
      const code = authErr?.code || '';
      let msg = 'Registration failed. Please check credentials.';

      if (code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled in your Firebase Console. Please enable "Email/Password" in Firebase Console (Authentication > Sign-in method), or sign in with 1-Tap Google Sign-In.';
      } else if (code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please switch to the "Sign In" tab to log in.';
      } else if (code === 'auth/invalid-email') {
        msg = 'The email address format is invalid.';
      } else if (code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network connection error. Please verify your internet connection.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait a minute and retry.';
      } else if (authErr?.message) {
        msg = authErr.message.replace(/^Firebase:\s*/, '');
      }

      this.notify('error', msg);
      return { success: false, error: msg };
    }

    const effectiveShopName = params.shopName?.trim() || 'A.K. Hardware Store';
    const userProfile: UserProfile = {
      id: cred.user.uid,
      email: cleanEmail,
      name: params.name?.trim() || 'Shop Owner',
      shopName: effectiveShopName,
    };

    try {
      // Save user record in Firestore under users/{uid}
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cleanEmail,
        name: userProfile.name,
        shopName: effectiveShopName,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      // Save initial settings in Firestore
      await setDoc(doc(db, 'users', cred.user.uid, 'settings', 'general'), {
        shopName: effectiveShopName,
        shopAddress: '',
        shopPhone: '',
        shopUpiId: '',
        voiceLanguage: 'en',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (firestoreErr) {
      console.warn('Initial Firestore setup deferred:', firestoreErr);
    }

    this.currentUser = userProfile;
    ShopStorage.setActiveNamespace(cred.user.uid);
    localStorage.setItem(`ak_${cred.user.uid}_shop_name`, effectiveShopName);

    this.attachLiveListeners(cred.user.uid);
    this.recordSyncTime();
    this.notify('synced');
    return { success: true, user: userProfile };
  }

  public async login(params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = params.email.trim();
    if (!cleanEmail) return { success: false, error: 'Email address is required.' };
    if (!params.password) return { success: false, error: 'Password is required.' };

    try {
      this.notify('syncing');
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, params.password);

      let userData: any = null;
      try {
        const userDocRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userDocRef);
        userData = userSnap.exists() ? userSnap.data() : null;
      } catch (e) {
        console.warn('Unable to load user profile document:', e);
      }

      const userProfile: UserProfile = {
        id: cred.user.uid,
        email: cleanEmail,
        name: userData?.name || 'Shop Owner',
        shopName: userData?.shopName || 'A.K. Hardware Store',
      };

      this.currentUser = userProfile;
      ShopStorage.setActiveNamespace(cred.user.uid);

      if (userData?.shopName) {
        localStorage.setItem(`ak_${cred.user.uid}_shop_name`, userData.shopName);
      }

      await this.hydrateFromCloud(cred.user.uid);
      this.attachLiveListeners(cred.user.uid);
      this.recordSyncTime();
      this.notify('synced');
      return { success: true, user: userProfile };
    } catch (err: any) {
      console.error('Firebase Auth Login Error:', err);
      const code = err?.code || '';
      let msg = 'Sign in failed. Please check your credentials.';

      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please verify your credentials or register a new account.';
      } else if (code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled in Firebase Console. Please enable "Email/Password" in Firebase Console (Authentication > Sign-in method), or sign in with Google.';
      } else if (code === 'auth/invalid-email') {
        msg = 'The email address format is invalid.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network connection issue. Please check your internet connection.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please wait a moment and retry.';
      } else if (err?.message) {
        msg = err.message.replace(/^Firebase:\s*/, '');
      }

      this.notify('error', msg);
      return { success: false, error: msg };
    }
  }

  public async loginWithGoogle(): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      this.notify('syncing');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      const effectiveShopName = 'A.K. Hardware Store';
      const userProfile: UserProfile = {
        id: cred.user.uid,
        email: cred.user.email || 'owner@akware.com',
        name: cred.user.displayName || 'Shop Owner',
        shopName: effectiveShopName,
      };

      try {
        const userDocRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          await setDoc(userDocRef, {
            uid: cred.user.uid,
            email: userProfile.email,
            name: userProfile.name,
            shopName: effectiveShopName,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } else {
          const data = userSnap.data();
          if (data?.shopName) userProfile.shopName = data.shopName;
          if (data?.name) userProfile.name = data.name;
        }
      } catch (e) {
        console.warn('Failed to save Google profile:', e);
      }

      this.currentUser = userProfile;
      ShopStorage.setActiveNamespace(cred.user.uid);
      localStorage.setItem(`ak_${cred.user.uid}_shop_name`, userProfile.shopName);

      await this.hydrateFromCloud(cred.user.uid);
      this.attachLiveListeners(cred.user.uid);
      this.recordSyncTime();
      this.notify('synced');
      return { success: true, user: userProfile };
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      const code = err?.code || '';
      let msg = 'Google Sign-In failed.';
      if (code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in cancelled (popup was closed before completing).';
      } else if (code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by browser. Please enable popups for this site.';
      } else if (err?.message) {
        msg = err.message.replace(/^Firebase:\s*/, '');
      }
      this.notify('error', msg);
      return { success: false, error: msg };
    }
  }

  public async sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true };
    } catch (err: any) {
      console.error('Password reset error:', err);
      const code = err?.code || '';
      let msg = 'Failed to send password reset email.';
      if (code === 'auth/user-not-found') {
        msg = 'No registered shop account found with this email.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a moment before trying again.';
      } else if (err?.message) {
        msg = err.message.replace(/^Firebase:\s*/, '');
      }
      return { success: false, error: msg };
    }
  }

  public async logout(): Promise<void> {
    this.detachLiveListeners();
    ShopStorage.registerMutationListener(null);
    try {
      await firebaseSignOut(auth);
    } catch {}
    this.currentUser = null;
    ShopStorage.setActiveNamespace(null);
    this.authStatus = 'signedOut';
    this.notifyAuthChange();
    this.notify('idle');
    this.triggerDataUpdate();
  }

  // --- Deletion of Sample Records in Cloud ---
  public async clearCloudSampleData(sampleDocIds: { [col: string]: string[] }): Promise<{ success: boolean; error?: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: true }; // Local only if not logged in

    try {
      this.notify('syncing');
      for (const [colName, ids] of Object.entries(sampleDocIds)) {
        for (const docId of ids) {
          try {
            await deleteDoc(doc(db, 'users', uid, colName, docId));
          } catch (e) {
            console.warn(`Failed to delete sample doc ${colName}/${docId}:`, e);
          }
        }
      }
      this.recordSyncTime();
      this.notify('synced');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to clear sample records from cloud.' };
    }
  }

  // --- Full Push to Cloud (Manual backup or bulk save) ---
  public async pushToCloud(customUid?: string): Promise<{ success: boolean; error?: string }> {
    const uid = customUid || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return { success: false, error: 'Not signed in' };

    try {
      this.notify('syncing');

      const products = ShopStorage.getProducts();
      for (const p of products) {
        await setDoc(doc(db, 'users', uid, 'products', p.id), p, { merge: true });
      }

      const sales = ShopStorage.getSales();
      for (const s of sales) {
        await setDoc(doc(db, 'users', uid, 'sales', s.id), s, { merge: true });
      }

      const contacts = ShopStorage.getContacts();
      for (const c of contacts) {
        await setDoc(doc(db, 'users', uid, 'contacts', c.id), c, { merge: true });
      }

      const purchases = ShopStorage.getPurchases();
      for (const pu of purchases) {
        await setDoc(doc(db, 'users', uid, 'purchases', pu.id), pu, { merge: true });
      }

      const payments = ShopStorage.getPayments();
      for (const py of payments) {
        await setDoc(doc(db, 'users', uid, 'payments', py.id), py, { merge: true });
      }

      const expenses = ShopStorage.getExpenses();
      for (const ex of expenses) {
        await setDoc(doc(db, 'users', uid, 'expenses', ex.id), ex, { merge: true });
      }

      const categories = ShopStorage.getCategories();
      for (const cat of categories) {
        await setDoc(doc(db, 'users', uid, 'categories', cat.id), cat, { merge: true });
      }

      const estimates = ShopStorage.getEstimates();
      for (const est of estimates) {
        await setDoc(doc(db, 'users', uid, 'estimates', est.id), est, { merge: true });
      }

      const profs = ShopStorage.getProfessionals();
      for (const pr of profs) {
        await setDoc(doc(db, 'users', uid, 'professionals', pr.id), pr, { merge: true });
      }

      this.recordSyncTime();
      this.notify('synced');
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to sync data to Firebase';
      this.notify('error', errMsg);
      return { success: false, error: errMsg };
    }
  }

  public async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (!this.isLoggedIn()) return { success: false, error: 'Not signed in' };
    return this.pushToCloud();
  }

  // --- Diagnostics & Health Inspection ---
  public getDiagnostics(): SyncDiagnosticInfo {
    const rawUid = this.currentUser?.id || null;
    const rawEmail = this.currentUser?.email || null;

    const maskString = (str: string | null, visibleStart = 3, visibleEnd = 3): string | null => {
      if (!str) return null;
      if (str.length <= visibleStart + visibleEnd) return '***';
      return `${str.slice(0, visibleStart)}...${str.slice(-visibleEnd)}`;
    };

    const maskEmail = (email: string | null): string | null => {
      if (!email) return null;
      const [user, domain] = email.split('@');
      if (!domain) return maskString(email);
      return `${user.slice(0, 1)}***@${domain}`;
    };

    const sampleCounts = ShopStorage.getSampleCounts();

    return {
      authStatus: this.authStatus,
      userIdMasked: maskString(rawUid, 4, 4),
      userEmailMasked: maskEmail(rawEmail),
      syncStatus: this.currentStatus,
      isOnline: this.isOnline,
      initialHydrationComplete: this.initialHydrationComplete,
      lastSuccessfulSync: this.getLastSyncTime(),
      pendingWritesCount: this.pendingWritesCount,
      collectionCounts: {
        products: ShopStorage.getProducts().length,
        sales: ShopStorage.getSales().length,
        contacts: ShopStorage.getContacts().length,
        professionals: ShopStorage.getProfessionals().length,
        purchases: ShopStorage.getPurchases().length,
        payments: ShopStorage.getPayments().length,
        expenses: ShopStorage.getExpenses().length,
        estimates: ShopStorage.getEstimates().length,
      },
      sampleRecordsCount: sampleCounts.total,
      lastError: this.currentError,
      appVersion: '3.0-Production',
      schemaVersion: 2,
    };
  }
}

export const cloudSync = new CloudSyncService();
