/**
 * Helper untuk memperbarui Favicon dan Title browser secara dinamis
 * sesuai dengan branding dan Logo Restoran yang aktif.
 */
export function updateFavicon(logoUrl?: string, brandName?: string): void {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  if (brandName && brandName.trim()) {
    document.title = `${brandName.trim()} - POS Restoran`;
  }

  if (!logoUrl || !logoUrl.trim()) return;

  const setFaviconHref = (href: string) => {
    // Hapus favicon lama agar browser merefresh cache favicon tab
    const existingLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    existingLinks.forEach((el) => el.remove());

    const newLink = document.createElement('link');
    newLink.rel = 'icon';

    if (href.startsWith('data:image/svg') || href.endsWith('.svg')) {
      newLink.type = 'image/svg+xml';
    } else {
      newLink.type = 'image/png';
    }

    newLink.href = href;
    document.head.appendChild(newLink);
  };

  // 2. Format logo menjadi persegi tajam (Square 64x64) via Canvas
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setFaviconHref(logoUrl);
        return;
      }

      ctx.clearRect(0, 0, size, size);

      // Hitung posisi tengah agar logo square tanpa distorsi
      const hRatio = size / img.width;
      const vRatio = size / img.height;
      const ratio = Math.min(hRatio, vRatio);

      const centerShiftX = (size - img.width * ratio) / 2;
      const centerShiftY = (size - img.height * ratio) / 2;

      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        centerShiftX,
        centerShiftY,
        img.width * ratio,
        img.height * ratio
      );

      const faviconDataUrl = canvas.toDataURL('image/png');
      setFaviconHref(faviconDataUrl);
    } catch {
      // Fallback jika terjadi CORS pembatasan canvas dari URL eksternal
      setFaviconHref(logoUrl);
    }
  };

  img.onerror = () => {
    setFaviconHref(logoUrl);
  };

  img.src = logoUrl;
}
