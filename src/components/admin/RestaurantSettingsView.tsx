import React, { useState, useEffect, useRef } from 'react';
import type { RestaurantSettings } from '../../types';
import { db, DEFAULT_SETTINGS } from '../../lib/db';
import { syncService } from '../../services/syncService';
import { uploadRestaurantLogo } from '../../services/storageService';
import { updateFavicon } from '../../lib/favicon';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  Store,
  MapPin,
  Phone,
  Image as ImageIcon,
  Percent,
  MessageSquare,
  Save,
  CheckCircle2,
  Sparkles,
  Receipt,
  RotateCcw,
  UploadCloud,
  Loader2,
  Trash2,
  Link,
  Cloud,
  HardDrive,
  Info,
} from 'lucide-react';

interface RestaurantSettingsViewProps {
  currentSettings: RestaurantSettings | null;
  onSettingsSaved: (newSettings: RestaurantSettings) => void;
}

export const RestaurantSettingsView: React.FC<RestaurantSettingsViewProps> = ({
  currentSettings,
  onSettingsSaved,
}) => {
  const [formData, setFormData] = useState<RestaurantSettings>(
    currentSettings || DEFAULT_SETTINGS
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentSettings) {
      setFormData(currentSettings);
    }
  }, [currentSettings]);

  const handleChange = (
    field: keyof RestaurantSettings,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setUploadNotice(null);

    try {
      const result = await uploadRestaurantLogo(file);
      handleChange('logo_url', result.url);
      updateFavicon(result.url, formData.name);

      if (result.isRemote) {
        setUploadNotice('Logo berhasil diunggah ke Supabase Cloud Storage!');
      } else if (result.error) {
        setUploadNotice(result.error);
      } else {
        setUploadNotice('Logo disimpan secara lokal di IndexedDB (Mode Offline).');
      }
    } catch (err: any) {
      alert('Gagal mengunggah gambar: ' + (err?.message || err));
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    handleChange('logo_url', '');
    setUploadNotice(null);
    updateFavicon('/vite.svg', formData.name);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: RestaurantSettings = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      await db.settings.put(updated);
      await syncService.pushSettings(updated);
      updateFavicon(updated.logo_url, updated.name);

      onSettingsSaved(updated);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan pengaturan ke default contoh?')) {
      setFormData(DEFAULT_SETTINGS);
      setUploadNotice(null);
    }
  };

  const isBase64Logo = formData.logo_url?.startsWith('data:');
  const isCloudLogo = formData.logo_url?.includes('supabase.co');

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {showToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm">
              Pengaturan White-label Berhasil Disimpan & Diterapkan!
            </span>
          </div>
          <span className="text-xs text-emerald-600">Sinkron ke IndexedDB & Cloud</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Konfigurasi (Kiri: 7 kolom) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                <span>Identitas & White-Label Restoran</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kustomisasi nama usaha, logo, kontak, dan footer struk kasir thermal Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition cursor-pointer"
              title="Reset ke data contoh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Contoh</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Nama Resto & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Restoran / Brand *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Kenangan / Resto Nusantara"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tagline / Slogan
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Contoh: Rasa Autentik Nusantara"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Upload Logo Restoran Dropzone */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Logo Restoran (Backend Upload & Cloud Storage)
                </label>
                <button
                  type="button"
                  onClick={() => setShowManualUrl((prev) => !prev)}
                  className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Link className="w-3 h-3" />
                  <span>{showManualUrl ? 'Gunakan Upload File' : 'Input URL Manual'}</span>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload Card / Dropzone */}
              {!showManualUrl ? (
                <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-2xl transition-all">
                  {formData.logo_url ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Logo Thumbnail */}
                      <div className="relative group">
                        <img
                          src={formData.logo_url}
                          alt="Logo Preview"
                          className="w-20 h-20 object-contain border-0 shadow-none bg-transparent"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full shadow-md hover:bg-rose-600 transition"
                          title="Hapus Logo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Info & Change Buttons */}
                      <div className="flex-1 space-y-1.5 text-center sm:text-left">
                        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <span className="font-bold text-slate-800 text-xs">Logo Aktif</span>
                          {isCloudLogo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              <Cloud className="w-3 h-3 text-blue-600" />
                              Supabase Storage
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <HardDrive className="w-3 h-3 text-amber-600" />
                              {isBase64Logo ? 'IndexedDB Lokal (Base64)' : 'External URL'}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Logo ini otomatis dicetak di struk thermal dan header kasir.
                        </p>

                        <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                          <button
                            type="button"
                            disabled={isUploadingLogo}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingLogo ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                            ) : (
                              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{isUploadingLogo ? 'Mengunggah...' : 'Ganti Logo Baru'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:underline transition"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Kosong: Tombol Upload */
                    <div
                      onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                      className="py-6 flex flex-col items-center justify-center text-center cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 group-hover:bg-orange-200 text-orange-600 flex items-center justify-center mb-2 transition">
                        {isUploadingLogo ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <UploadCloud className="w-6 h-6" />
                        )}
                      </div>
                      <span className="font-bold text-xs text-slate-800 group-hover:text-orange-600 transition">
                        {isUploadingLogo
                          ? 'Sedang mengunggah dan mengompresi logo...'
                          : 'Klik untuk Upload Logo Restoran'}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        {isSupabaseConfigured
                          ? 'Otomatis diunggah ke Supabase Cloud Storage bucket (restaurant-assets).'
                          : 'Tersimpan otomatis ke database IndexedDB lokal browser kasir.'}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-2 font-mono">
                        PNG, JPG, SVG, WebP (Maks 5MB)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Input Manual URL */
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://example.com/logo-restoran.png"
                    value={formData.logo_url || ''}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              )}

              {/* Upload Notification feedback */}
              {uploadNotice && (
                <div className="mt-2 text-[11px] text-slate-600 bg-slate-100 p-2 rounded-xl flex items-center gap-1.5 border border-slate-200">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{uploadNotice}</span>
                </div>
              )}
            </div>

            {/* Alamat & Nomor Telepon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Restoran *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Jl. Kuliner No. 12, Jakarta"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Telepon / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="0812-3456-7890"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Pajak PB1 % */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pajak Restoran PB1 (%)
              </label>
              <div className="relative max-w-xs">
                <Percent className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={formData.tax_percentage}
                  onChange={(e) => handleChange('tax_percentage', parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standar Pajak Barang & Jasa Tertentu (PB1) restoran di Indonesia adalah 10%.
              </p>
            </div>

            {/* Footer Struk Thermal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pesan Footer Struk Kasir
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea
                  rows={3}
                  value={formData.receipt_footer}
                  onChange={(e) => handleChange('receipt_footer', e.target.value)}
                  placeholder="Terima Kasih Atas Kunjungan Anda!..."
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Pesan ini akan dicetak di bagian paling bawah struk thermal pelanggan.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving || isUploadingLogo}
                className="w-full py-3 px-5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 stroke-2" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan Branding'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Struk Thermal (Kanan: 5 kolom) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Live Preview Struk Thermal
              </span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
              Kertas 58mm / 80mm
            </span>
          </div>

          {/* Struk Card Mockup */}
          <div className="bg-white p-5 rounded-3xl border border-slate-300 shadow-lg font-mono text-xs text-slate-800 space-y-3">
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-400 space-y-1">
              {formData.logo_url && (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={formData.logo_url}
                    alt={formData.name}
                    className="w-16 h-16 object-contain rounded-none border-0 shadow-none bg-transparent"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h2 className="font-black text-sm uppercase tracking-wider text-slate-900">
                {formData.name || 'NAMA RESTORAN'}
              </h2>
              {formData.tagline && (
                <p className="text-[10px] text-slate-600 font-medium">
                  {formData.tagline}
                </p>
              )}
              <p className="text-[10px] text-slate-500">
                {formData.address || 'Alamat Restoran'}
              </p>
              <p className="text-[10px] text-slate-500">Telp: {formData.phone || '-'}</p>
            </div>

            {/* Info Transaksi Contoh */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">No. Invoice:</span>
                <span className="font-bold">INV-PREVIEW-001</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipe:</span>
                <span className="font-semibold uppercase">DINE-IN (MEJA 05)</span>
              </div>
            </div>

            {/* Contoh Item */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>1x Nasi Goreng Spesial</span>
                <span>Rp 32.000</span>
              </div>
              <div className="flex justify-between">
                <span>1x Es Teh Manis Jumbo</span>
                <span>Rp 6.000</span>
              </div>
            </div>

            {/* Total & Pajak */}
            <div className="py-2 border-b-2 border-dashed border-slate-400 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp 38.000</span>
              </div>
              <div className="flex justify-between text-orange-600 font-medium">
                <span>Pajak PB1 ({formData.tax_percentage}%)</span>
                <span>Rp {Math.round(38000 * (formData.tax_percentage / 100)).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 text-slate-900">
                <span>TOTAL</span>
                <span>Rp {(38000 + Math.round(38000 * (formData.tax_percentage / 100))).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Footer Custom Message */}
            <div className="pt-2 text-center text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
              {formData.receipt_footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
