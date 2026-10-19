import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any cookies to ensure completely open, barrier-free access without session restrictions
if (typeof document !== 'undefined' && document.cookie) {
  try {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
  } catch {}
}

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for PWA phone installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('PWA ServiceWorker registered with scope:', reg.scope);
    }).catch((err) => {
      console.warn('SW registration error:', err);
    });
  });
}
