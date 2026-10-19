import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { ShopStorage } from './storage';
import { Product, Sale, Contact, Professional, Category, Purchase, Payment, Expense, MaterialEstimate } from '../types';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  shopName: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

type SyncListener = (status: SyncStatus, lastSync: string | null, error?: string) => void;

class CloudSyncService {
  private syncListeners: SyncListener[] = [];
  private currentStatus: SyncStatus = 'idle';
  private currentError: string | null = null;
  private currentUser: UserProfile | null = null;
  private unsubscribes: Unsubscribe[] = [];
  private onDataUpdatedCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Restore user cache if available
      try {
        const cached = localStorage.getItem('ak_auth_user_v1');
        if (cached) {
          this.currentUser = JSON.parse(cached);
        }
      } catch {}

      // Listen for Firebase Auth changes
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Shop Owner',
            shopName: localStorage.getItem('ak_shop_name') || 'Hardware & Paints Store',
          };
          this.currentUser = profile;
          localStorage.setItem('ak_auth_user_v1', JSON.stringify(profile));
          localStorage.setItem('ak_auth_token_v1', firebaseUser.uid);

          this.notify('syncing');
          this.attachLiveListeners(firebaseUser.uid);
        } else {
          this.detachLiveListeners();
          this.currentUser = null;
          localStorage.removeItem('ak_auth_user_v1');
          localStorage.removeItem('ak_auth_token_v1');
          this.notify('idle');
        }
      });

      window.addEventListener('online', () => {
        if (this.currentUser) {
          this.notify('synced');
          this.pushToCloud().catch(() => {});
        }
      });

      window.addEventListener('offline', () => {
        this.notify('offline', 'Device is offline. Changes saved locally.');
      });
    }
  }

  public registerDataUpdateListener(cb: () => void) {
    this.onDataUpdatedCallback = cb;
  }

  public subscribe(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    listener(this.currentStatus, this.getLastSyncTime(), this.currentError || undefined);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private notify(status: SyncStatus, error?: string) {
    this.currentStatus = status;
    this.currentError = error || null;
    const lastSync = this.getLastSyncTime();
    this.syncListeners.forEach((listener) => listener(status, lastSync, error));
  }

  public isLoggedIn(): boolean {
    return Boolean(this.currentUser && auth.currentUser);
  }

  public getUser(): UserProfile | null {
    return this.currentUser;
  }

  public getToken(): string | null {
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public getLastSyncTime(): string | null {
    try {
      return localStorage.getItem('ak_last_sync_v1');
    } catch {
      return null;
    }
  }

  public isAutoSyncEnabled(): boolean {
    try {
      const val = localStorage.getItem('ak_auto_sync_v1');
      return val !== 'false';
    } catch {
      return true;
    }
  }

  public setAutoSyncEnabled(enabled: boolean): void {
    try {
      localStorage.setItem('ak_auto_sync_v1', String(enabled));
    } catch {}
  }

  // --- 1. ROBUST EMAIL & GOOGLE AUTHENTICATION ---
  public async register(params: {
    email: string;
    password: string;
    name?: string;
    shopName?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = params.email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const err = 'Please enter a valid email address.';
      this.notify('error', err);
      return { success: false, error: err };
    }
    if (!params.password || params.password.length < 6) {
      const err = 'Password must be at least 6 characters long.';
      this.notify('error', err);
      return { success: false, error: err };
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
        msg = 'Email/Password registration is not yet enabled in Firebase Project Console. Please enable "Email/Password" in Firebase Console (Authentication > Sign-in method), or use 1-Tap Google Sign-In below.';
      } else if (code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please switch to the "Sign In" tab above to log in.';
      } else if (code === 'auth/invalid-email') {
        msg = 'The email address format is invalid. Please check for typos.';
      } else if (code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait a minute and try again.';
      } else if (authErr?.message) {
        msg = authErr.message.replace(/^Firebase:\s*/, '');
      }

      this.notify('error', msg);
      return { success: false, error: msg };
    }

    const effectiveShopName = params.shopName?.trim() || localStorage.getItem('ak_shop_name') || 'Hardware & Paints Store';
    const userProfile: UserProfile = {
      id: cred.user.uid,
      email: cleanEmail,
      name: params.name?.trim() || 'Shop Owner',
      shopName: effectiveShopName,
    };

    try {
      // Save user record in Firestore under users/{uid}
      const userDocRef = doc(db, 'users', cred.user.uid);
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        email: cleanEmail,
        name: userProfile.name,
        shopName: effectiveShopName,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      // Save general settings in Firestore
      await setDoc(doc(db, 'users', cred.user.uid, 'settings', 'general'), {
        shopName: effectiveShopName,
        shopAddress: localStorage.getItem('ak_shop_address') || '',
        shopPhone: localStorage.getItem('ak_shop_phone') || '',
        shopUpiId: localStorage.getItem('ak_shop_upi_id') || '',
        voiceLanguage: localStorage.getItem('ak_voice_language') || 'en',
      }, { merge: true });

      // Initial push of existing local shop data so cloud gets immediate copy
      await this.pushToCloud(cred.user.uid);
    } catch (firestoreErr) {
      console.warn('Initial Firestore setup deferred:', firestoreErr);
    }

    this.currentUser = userProfile;
    localStorage.setItem('ak_auth_user_v1', JSON.stringify(userProfile));
    localStorage.setItem('ak_auth_token_v1', cred.user.uid);
    localStorage.setItem('ak_shop_name', effectiveShopName);

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
    if (!cleanEmail) {
      const err = 'Email address is required.';
      this.notify('error', err);
      return { success: false, error: err };
    }
    if (!params.password) {
      const err = 'Password is required.';
      this.notify('error', err);
      return { success: false, error: err };
    }

    try {
      this.notify('syncing');
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, params.password);
      
      // Pull user profile doc
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
        shopName: userData?.shopName || localStorage.getItem('ak_shop_name') || 'Hardware & Paints Store',
      };

      this.currentUser = userProfile;
      localStorage.setItem('ak_auth_user_v1', JSON.stringify(userProfile));
      localStorage.setItem('ak_auth_token_v1', cred.user.uid);
      if (userData?.shopName) {
        localStorage.setItem('ak_shop_name', userData.shopName);
      }

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
        msg = 'Email/Password sign-in is not enabled in Firebase Console. Please enable "Email/Password" in Firebase Console (Authentication > Sign-in method), or sign in with Google below.';
      } else if (code === 'auth/invalid-email') {
        msg = 'The email address format is invalid.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network connection issue. Please check your internet connection.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please wait a few moments and retry.';
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

      const effectiveShopName = localStorage.getItem('ak_shop_name') || 'Hardware & Paints Store';
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
        console.warn('Failed to load/save user doc after Google login:', e);
      }

      this.currentUser = userProfile;
      localStorage.setItem('ak_auth_user_v1', JSON.stringify(userProfile));
      localStorage.setItem('ak_auth_token_v1', cred.user.uid);
      localStorage.setItem('ak_shop_name', userProfile.shopName);

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
        msg = 'Sign-in popup was blocked by browser. Please enable popups for this site and retry.';
      } else if (code === 'auth/cancelled-popup-request') {
        msg = 'A previous sign-in attempt was in progress. Please retry.';
      } else if (code === 'auth/operation-not-allowed') {
        msg = 'Google Sign-In is not enabled in Firebase Console (Authentication > Sign-in method).';
      } else if (err?.message) {
        msg = err.message.replace(/^Firebase:\s*/, '');
      }
      this.notify('error', msg);
      return { success: false, error: msg };
    }
  }

  public async logout(): Promise<void> {
    this.detachLiveListeners();
    try {
      await firebaseSignOut(auth);
    } catch {}
    this.currentUser = null;
    try {
      localStorage.removeItem('ak_auth_user_v1');
      localStorage.removeItem('ak_auth_token_v1');
    } catch {}
    this.notify('idle');
  }

  /**
   * Conflict resolution: Keep newest edited record based on updatedAt or createdAt
   */
  private mergeByNewest<T extends { id: string; updatedAt?: string; createdAt?: string }>(
    localList: T[],
    cloudList: T[]
  ): T[] {
    const map = new Map<string, T>();
    for (const item of localList) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const cloudItem of cloudList) {
      if (!cloudItem || !cloudItem.id) continue;
      const localItem = map.get(cloudItem.id);
      if (!localItem) {
        map.set(cloudItem.id, cloudItem);
      } else {
        const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
        const cloudTime = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
        if (cloudTime >= localTime) {
          map.set(cloudItem.id, cloudItem);
        }
      }
    }
    return Array.from(map.values());
  }

  private mergeSalesByNewest(localSales: Sale[], cloudSales: Sale[]): Sale[] {
    const map = new Map<string, Sale>();
    for (const s of localSales) {
      if (s && s.id) map.set(s.id, s);
    }
    for (const s of cloudSales) {
      if (!s || !s.id) continue;
      const local = map.get(s.id);
      if (!local) {
        map.set(s.id, s);
      } else {
        const localTime = new Date(local.createdAt || local.date || 0).getTime();
        const cloudTime = new Date(s.createdAt || s.date || 0).getTime();
        if (cloudTime >= localTime) {
          map.set(s.id, s);
        }
      }
    }
    return Array.from(map.values());
  }

  // --- 2. MULTI-DEVICE LIVE DATA SYNCHRONIZATION ---
  private attachLiveListeners(uid: string) {
    this.detachLiveListeners();

    // 1. Products Listener (Instant live sync across screens)
    const unsubProducts = onSnapshot(collection(db, 'users', uid, 'products'), (snapshot) => {
      const cloudProducts: Product[] = [];
      snapshot.forEach((d) => cloudProducts.push(d.data() as Product));
      if (cloudProducts.length > 0) {
        const local = ShopStorage.getProducts();
        const resolved = this.mergeByNewest(local, cloudProducts);
        ShopStorage.loadCustomData({ products: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Products sync listener error:', err);
    });
    this.unsubscribes.push(unsubProducts);

    // 2. Sales Listener
    const unsubSales = onSnapshot(collection(db, 'users', uid, 'sales'), (snapshot) => {
      const cloudSales: Sale[] = [];
      snapshot.forEach((d) => cloudSales.push(d.data() as Sale));
      if (cloudSales.length > 0) {
        const local = ShopStorage.getSales();
        const resolved = this.mergeSalesByNewest(local, cloudSales);
        ShopStorage.loadCustomData({ sales: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Sales sync listener error:', err);
    });
    this.unsubscribes.push(unsubSales);

    // 3. Contacts / Khata Listener
    const unsubContacts = onSnapshot(collection(db, 'users', uid, 'contacts'), (snapshot) => {
      const cloudContacts: Contact[] = [];
      snapshot.forEach((d) => cloudContacts.push(d.data() as Contact));
      if (cloudContacts.length > 0) {
        const local = ShopStorage.getContacts();
        const resolved = this.mergeByNewest(local, cloudContacts);
        ShopStorage.loadCustomData({ contacts: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Contacts sync listener error:', err);
    });
    this.unsubscribes.push(unsubContacts);

    // 4. Professionals Listener
    const unsubProfs = onSnapshot(collection(db, 'users', uid, 'professionals'), (snapshot) => {
      const cloudProfs: Professional[] = [];
      snapshot.forEach((d) => cloudProfs.push(d.data() as Professional));
      if (cloudProfs.length > 0) {
        const local = ShopStorage.getProfessionals();
        const resolved = this.mergeByNewest(local, cloudProfs);
        ShopStorage.loadCustomData({ professionals: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Professionals sync listener error:', err);
    });
    this.unsubscribes.push(unsubProfs);

    // 5. Purchases Listener
    const unsubPurchases = onSnapshot(collection(db, 'users', uid, 'purchases'), (snapshot) => {
      const cloudPurchases: Purchase[] = [];
      snapshot.forEach((d) => cloudPurchases.push(d.data() as Purchase));
      if (cloudPurchases.length > 0) {
        const local = ShopStorage.getPurchases();
        const resolved = this.mergeByNewest(local, cloudPurchases);
        ShopStorage.loadCustomData({ purchases: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Purchases sync listener error:', err);
    });
    this.unsubscribes.push(unsubPurchases);

    // 6. Payments Listener
    const unsubPayments = onSnapshot(collection(db, 'users', uid, 'payments'), (snapshot) => {
      const cloudPayments: Payment[] = [];
      snapshot.forEach((d) => cloudPayments.push(d.data() as Payment));
      if (cloudPayments.length > 0) {
        const local = ShopStorage.getPayments();
        const resolved = this.mergeByNewest(local, cloudPayments);
        ShopStorage.loadCustomData({ payments: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Payments sync listener error:', err);
    });
    this.unsubscribes.push(unsubPayments);

    // 7. Expenses Listener
    const unsubExpenses = onSnapshot(collection(db, 'users', uid, 'expenses'), (snapshot) => {
      const cloudExpenses: Expense[] = [];
      snapshot.forEach((d) => cloudExpenses.push(d.data() as Expense));
      if (cloudExpenses.length > 0) {
        const local = ShopStorage.getExpenses();
        const resolved = this.mergeByNewest(local, cloudExpenses);
        ShopStorage.loadCustomData({ expenses: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Expenses sync listener error:', err);
    });
    this.unsubscribes.push(unsubExpenses);

    // 8. Categories Listener
    const unsubCategories = onSnapshot(collection(db, 'users', uid, 'categories'), (snapshot) => {
      const cloudCats: Category[] = [];
      snapshot.forEach((d) => cloudCats.push(d.data() as Category));
      if (cloudCats.length > 0) {
        const local = ShopStorage.getCategories();
        const resolved = this.mergeByNewest(local, cloudCats);
        ShopStorage.loadCustomData({ categories: resolved });
        this.triggerDataUpdate();
      }
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Categories sync listener error:', err);
    });
    this.unsubscribes.push(unsubCategories);

    // 9. Settings Listener
    const unsubSettings = onSnapshot(collection(db, 'users', uid, 'settings'), (snapshot) => {
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.shopName) localStorage.setItem('ak_shop_name', data.shopName);
        if (data.shopAddress) localStorage.setItem('ak_shop_address', data.shopAddress);
        if (data.shopPhone) localStorage.setItem('ak_shop_phone', data.shopPhone);
        if (data.shopUpiId) localStorage.setItem('ak_shop_upi_id', data.shopUpiId);
        if (data.voiceLanguage) localStorage.setItem('ak_voice_language', data.voiceLanguage);
        if (data.shopGstin) localStorage.setItem('ak_shop_gstin', data.shopGstin);
        if (data.shopState) localStorage.setItem('ak_shop_state', data.shopState);
        if (data.shopStateCode) localStorage.setItem('ak_shop_state_code', data.shopStateCode);
        if (data.invoicePrefix) localStorage.setItem('ak_invoice_prefix', data.invoicePrefix);
      });
      this.triggerDataUpdate();
      this.recordSyncTime();
      this.notify('synced');
    }, (err) => {
      console.warn('Settings sync listener error:', err);
    });
    this.unsubscribes.push(unsubSettings);
  }

  private detachLiveListeners() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
  }

  private triggerDataUpdate() {
    if (this.onDataUpdatedCallback) {
      try {
        this.onDataUpdatedCallback();
      } catch {}
    }
  }

  private recordSyncTime() {
    try {
      const now = new Date().toISOString();
      localStorage.setItem('ak_last_sync_v1', now);
    } catch {}
  }

  // Push local database to Firestore
  public async pushToCloud(customUid?: string): Promise<{ success: boolean; error?: string }> {
    const uid = customUid || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return { success: false, error: 'Not logged in' };

    if (!navigator.onLine) {
      this.notify('offline', 'Device is offline. Changes saved locally.');
      return { success: false, error: 'Device is offline' };
    }

    try {
      this.notify('syncing');

      // 1. Push Products
      const products = ShopStorage.getProducts();
      for (const p of products) {
        await setDoc(doc(db, 'users', uid, 'products', p.id), p);
      }

      // 2. Push Sales
      const sales = ShopStorage.getSales();
      for (const s of sales) {
        await setDoc(doc(db, 'users', uid, 'sales', s.id), s);
      }

      // 3. Push Contacts
      const contacts = ShopStorage.getContacts();
      for (const c of contacts) {
        await setDoc(doc(db, 'users', uid, 'contacts', c.id), c);
      }

      // 4. Push Professionals
      const profs = ShopStorage.getProfessionals();
      for (const pr of profs) {
        await setDoc(doc(db, 'users', uid, 'professionals', pr.id), pr);
      }

      // 5. Push Purchases
      const purchases = ShopStorage.getPurchases();
      for (const pu of purchases) {
        await setDoc(doc(db, 'users', uid, 'purchases', pu.id), pu);
      }

      // 6. Push Payments
      const payments = ShopStorage.getPayments();
      for (const py of payments) {
        await setDoc(doc(db, 'users', uid, 'payments', py.id), py);
      }

      // 7. Push Expenses
      const expenses = ShopStorage.getExpenses();
      for (const ex of expenses) {
        await setDoc(doc(db, 'users', uid, 'expenses', ex.id), ex);
      }

      // 8. Push Categories
      const categories = ShopStorage.getCategories();
      for (const cat of categories) {
        await setDoc(doc(db, 'users', uid, 'categories', cat.id), cat);
      }

      // 9. Push Estimates
      const estimates = ShopStorage.getEstimates();
      for (const est of estimates) {
        await setDoc(doc(db, 'users', uid, 'estimates', est.id), est);
      }

      // 10. Push Settings
      await setDoc(doc(db, 'users', uid, 'settings', 'general'), {
        shopName: localStorage.getItem('ak_shop_name') || 'A.K. Hardware',
        shopAddress: localStorage.getItem('ak_shop_address') || '',
        shopPhone: localStorage.getItem('ak_shop_phone') || '',
        shopUpiId: localStorage.getItem('ak_shop_upi_id') || '',
        voiceLanguage: localStorage.getItem('ak_voice_language') || 'en',
        shopGstin: localStorage.getItem('ak_shop_gstin') || '',
        shopState: localStorage.getItem('ak_shop_state') || 'Madhya Pradesh',
        shopStateCode: localStorage.getItem('ak_shop_state_code') || '23',
        invoicePrefix: localStorage.getItem('ak_invoice_prefix') || 'AK/',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      this.recordSyncTime();
      this.notify('synced');
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to sync data to Firebase';
      this.notify('error', errMsg);
      return { success: false, error: errMsg };
    }
  }

  // Manual Trigger or Pull
  public async syncNow(): Promise<{ success: boolean; error?: string }> {
    if (!this.isLoggedIn()) {
      return { success: false, error: 'Not signed in' };
    }
    return this.pushToCloud();
  }

  // --- 3. REFINED CLOUD BACKUP SNAPSHOTS ---
  public async saveCloudBackupSnapshot(label?: string): Promise<{ success: boolean; id?: string; error?: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, error: 'Please sign in to your Firebase account to save cloud backups.' };

    try {
      this.notify('syncing');
      const backupJson = ShopStorage.exportBackupJSON();
      const parsed = JSON.parse(backupJson);
      const backupId = `backup_${Date.now()}`;
      
      const snapshotDocRef = doc(db, 'users', uid, 'backups', backupId);
      await setDoc(snapshotDocRef, {
        id: backupId,
        label: label || `Cloud Backup - ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        createdAt: new Date().toISOString(),
        shopName: parsed.shopName,
        stats: parsed.stats || {},
        payloadJson: backupJson,
      });

      this.recordSyncTime();
      this.notify('synced');
      return { success: true, id: backupId };
    } catch (err: any) {
      const msg = err?.message || 'Failed to save cloud backup snapshot.';
      this.notify('error', msg);
      return { success: false, error: msg };
    }
  }

  public async listCloudBackupSnapshots(): Promise<Array<{
    id: string;
    label: string;
    createdAt: string;
    shopName: string;
    stats: any;
  }>> {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    try {
      const q = query(collection(db, 'users', uid, 'backups'), orderBy('createdAt', 'desc'), limit(15));
      const snaps = await getDocs(q);
      const result: any[] = [];
      snaps.forEach(d => {
        const data = d.data();
        result.push({
          id: d.id,
          label: data.label || 'Snapshot',
          createdAt: data.createdAt,
          shopName: data.shopName || '',
          stats: data.stats || {},
        });
      });
      return result;
    } catch (err) {
      console.warn('Error fetching cloud backup snapshots:', err);
      return [];
    }
  }

  public async restoreFromCloudSnapshot(backupId: string, mode: 'merge' | 'replace' = 'replace'): Promise<{ success: boolean; error?: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) return { success: false, error: 'Not signed in.' };

    try {
      this.notify('syncing');
      const snapDoc = await getDoc(doc(db, 'users', uid, 'backups', backupId));
      if (!snapDoc.exists()) {
        return { success: false, error: 'Backup snapshot not found in cloud.' };
      }
      const data = snapDoc.data();
      if (!data.payloadJson) {
        return { success: false, error: 'Snapshot data is empty.' };
      }

      const res = ShopStorage.importBackupJSON(data.payloadJson, mode);
      if (res.success) {
        this.triggerDataUpdate();
        await this.pushToCloud(uid);
        this.notify('synced');
        return { success: true };
      } else {
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to restore snapshot.' };
    }
  }
}

export const cloudSync = new CloudSyncService();
