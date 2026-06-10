import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clean up and unregister any legacy service workers and clear cache storage safely (resolving Unexpected token < <!doctype html> errors)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      Promise.all(registrations.map((registration) => registration.unregister())).then(() => {
        console.log('Successfully unregistered active service worker to prevent API intercept issues.');
        const win = window as any;
        if ('caches' in win) {
          win.caches.keys().then((keys: string[]) => {
            Promise.all(keys.map((key) => win.caches.delete(key))).then(() => {
              win.location.reload();
            });
          });
        } else {
          win.location.reload();
        }
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(

  <StrictMode>
    <App />
  </StrictMode>,
);

