/**
 * PWA Service Worker Registration & Standalone Mode Helper
 * Dilengkapi dengan Auto-Update Checker & Instant Controller Reload
 */

let deferredPrompt: any = null;

// Daftarkan Service Worker dengan Auto-Update
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // 1. Reload otomatis saat Service Worker versi baru mengambil kendali
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Versi baru terdeteksi, merefresh aplikasi secara otomatis...');
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker terdaftar dengan scope:', registration.scope);

          // 2. Cek apakah ada update baru saat tab dibuka kembali / difokuskan
          window.addEventListener('focus', () => {
            registration.update().catch(() => {});
          });

          // 3. Cek update berkala setiap 5 menit jika sedang online
          setInterval(() => {
            if (navigator.onLine) {
              registration.update().catch(() => {});
            }
          }, 5 * 60 * 1000);

          // 4. Deteksi pergantian versi
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] Versi baru tersedia dan siap aktif!');
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
