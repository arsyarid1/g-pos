/**
 * PWA Service Worker Registration & Standalone Mode Helper
 */

let deferredPrompt: any = null;

// Daftarkan Service Worker
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker berhasil terdaftar dengan scope:', registration.scope);

          // Cek update
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] Konten versi baru tersedia; reload untuk update.');
                  } else {
                    console.log('[PWA] Konten telah dicache untuk penggunaan offline!');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('[PWA] Gagal mendaftarkan ServiceWorker:', error);
        });
    });

    // Tangkap event instalasi browser (Chrome, Edge, Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      window.dispatchEvent(new Event('pwa-installable'));
    });
  }
}

// Cek apakah aplikasi sedang berjalan dalam mode Standalone (PWA terpasang)
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Pemicu dialog install native browser
export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (err) {
    console.error('[PWA] Install prompt error:', err);
    return false;
  }
}
