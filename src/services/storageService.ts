import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UploadImageResult {
  url: string;
  isRemote: boolean;
  error?: string;
}

/**
 * Kompresi gambar umum via HTML5 Canvas
 */
async function compressImage(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

/**
 * Konversi File menjadi Base64 Data URL (untuk Local/Offline fallback)
 */
function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload logo restoran:
 * 1. Jika terhubung ke Supabase (Online): Upload ke Supabase Storage bucket 'restaurant-assets/logos'
 * 2. Jika offline / belum konfigurasi Supabase: Fallback ke Base64 Data URL (tersimpan di IndexedDB lokal)
 */
export async function uploadRestaurantLogo(file: File): Promise<UploadImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (PNG, JPG, WebP, SVG)');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran file logo maksimal 5MB');
  }

  const compressedBlob = await compressImage(file, 512, 512, 0.9);

  if (isSupabaseConfigured && supabase && navigator.onLine) {
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-assets')
        .upload(filePath, compressedBlob, {
          contentType: file.type || 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.warn('[Storage] Gagal upload logo ke Supabase Storage, fallback ke Base64 lokal:', uploadError.message);
        const base64 = await fileToBase64(compressedBlob);
        return {
          url: base64,
          isRemote: false,
          error: `Bucket cloud belum siap (${uploadError.message}). Logo disimpan secara lokal di IndexedDB.`,
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        isRemote: true,
      };
    } catch (err: any) {
      console.warn('[Storage] Catch error saat upload logo ke Supabase:', err);
      const base64 = await fileToBase64(compressedBlob);
      return {
        url: base64,
        isRemote: false,
        error: err?.message || 'Gagal terhubung ke cloud storage. Logo disimpan di lokal.',
      };
    }
  }

  const base64 = await fileToBase64(compressedBlob);
  return {
    url: base64,
    isRemote: false,
  };
}

/**
 * Upload Foto Produk / Menu Makanan:
 * 1. Mengompres foto produk (maks 800x800, JPEG 85%)
 * 2. Upload ke Supabase Storage bucket 'restaurant-assets/products'
 * 3. Fallback ke Base64 jika offline / Supabase belum siap
 */
export async function uploadProductImage(file: File): Promise<UploadImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (PNG, JPG, WebP)');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Ukuran file foto menu maksimal 8MB');
  }

  // Kompres foto menu agar tajam tapi ringan (maks 800x800)
  const compressedBlob = await compressImage(file, 800, 800, 0.85);

  if (isSupabaseConfigured && supabase && navigator.onLine) {
    try {
      const fileExt = 'jpg';
      const fileName = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-assets')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.warn('[Storage] Gagal upload foto produk ke Supabase Storage, fallback ke Base64 lokal:', uploadError.message);
        const base64 = await fileToBase64(compressedBlob);
        return {
          url: base64,
          isRemote: false,
          error: `Bucket cloud belum siap (${uploadError.message}). Foto disimpan secara lokal di IndexedDB.`,
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        isRemote: true,
      };
    } catch (err: any) {
      console.warn('[Storage] Catch error saat upload foto menu ke Supabase:', err);
      const base64 = await fileToBase64(compressedBlob);
      return {
        url: base64,
        isRemote: false,
        error: err?.message || 'Gagal upload ke cloud storage. Foto disimpan di lokal.',
      };
    }
  }

  // Fallback offline: Base64 data URL
  const base64 = await fileToBase64(compressedBlob);
  return {
    url: base64,
    isRemote: false,
  };
}
