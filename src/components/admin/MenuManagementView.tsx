import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { syncService } from '../../services/syncService';
import { uploadProductImage } from '../../services/storageService';
import type { LocalProduct, ProductCategory, ProductRecipe, Ingredient, ProductVariant } from '../../types';
import { formatRupiah } from '../../lib/utils';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChefHat,
  X,
  Check,
  UtensilsCrossed,
  Save,
  Layers,
  ArrowRight,
  UploadCloud,
  Loader2,
  Camera,
  Image as ImageIcon,
  Cloud,
  HardDrive,
  Link,
  Info,
} from 'lucide-react';

const CATEGORIES: ProductCategory[] = ['All', 'Makanan', 'Minuman', 'Snack', 'Dessert'];

export const MenuManagementView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('All');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<LocalProduct | null>(null);

  // Queries
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []) || [];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  // Handle open add / edit product modal
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: LocalProduct) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (product: LocalProduct) => {
    if (confirm(`Yakin ingin menghapus menu "${product.name}"?`)) {
      await db.products.delete(product.id);
      await db.recipes.where('product_id').equals(product.id).delete();
      syncService.pushProducts().catch(console.warn);
    }
  };

  const handleToggleActive = async (product: LocalProduct) => {
    await db.products.update(product.id, {
      is_active: !product.is_active,
      updated_at: new Date().toISOString(),
    });
    syncService.pushProducts().catch(console.warn);
  };

  // Handle open BOM recipe modal
  const handleOpenRecipeModal = (product: LocalProduct) => {
    setRecipeProduct(product);
    setIsRecipeModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Action, Search, Filter */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            <span>Manajemen Menu & Resep (BOM)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola katalog menu makanan, harga jual, serta resep bahan baku per porsi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddProduct}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-2" />
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari menu makanan atau minuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Menu Produk</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Harga Jual</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Resep (BOM)</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <UtensilsCrossed className="w-10 h-10 mb-2 stroke-1.5 text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">Belum Ada Menu Produk</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mb-4">
                        Katalog menu masih kosong. Klik tombol "+ Tambah Menu Pertama" di bawah untuk mendaftarkan menu makanan atau minuman Anda.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddProduct}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-2" />
                        <span>Tambah Menu Pertama</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada menu produk yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.image_url ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'
                          }
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-xl border border-slate-200 shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 block text-sm">
                              {p.name}
                            </span>
                            {p.has_variants && p.variants && p.variants.length > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                {p.variants.length} Varian
                              </span>
                            )}
                          </div>
                          {p.has_variants && p.variants && p.variants.length > 0 ? (
                            <span className="text-[10px] text-orange-600 block mt-0.5 font-medium">
                              {p.variants.map((v) => `${v.name} (${formatRupiah(v.price)})`).join(', ')}
                            </span>
                          ) : p.description ? (
                            <span className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                              {p.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-orange-600 text-sm">
                      {formatRupiah(p.price)}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          p.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.is_active ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        <span>{p.is_active ? 'Tersedia' : 'Nonaktif / Habis'}</span>
                      </button>
                    </td>

                    {/* BOM Recipe Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenRecipeModal(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition cursor-pointer border border-orange-200"
                        title="Atur bahan baku yang terpakai saat menu ini terjual"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Atur Resep</span>
                      </button>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="Edit Menu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          title="Hapus Menu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Tambah / Edit Menu */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={editingProduct}
      />

      {/* Modal 2: Atur Resep & Bahan Baku (BOM) */}
      <RecipeBOMModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        product={recipeProduct}
        availableIngredients={ingredients}
      />
    </div>
  );
};

/* ========================================================
   SUB-MODAL 1: FORM PRODUK MENU DENGAN UPLOAD FOTO
   ======================================================== */
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: LocalProduct | null;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Makanan');
  const [price, setPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant states (Opsi Suhu / Ukuran / Kemasan Berbeda Harga)
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Photo upload states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setPrice(productToEdit.price.toString());
      setImageUrl(productToEdit.image_url || '');
      setDescription(productToEdit.description || '');
      setIsActive(productToEdit.is_active);
      setHasVariants(Boolean(productToEdit.has_variants && productToEdit.variants && productToEdit.variants.length > 0));
      setVariants(productToEdit.variants || []);
      setPhotoNotice(null);
    } else {
      setName('');
      setCategory('Makanan');
      setPrice('');
      setImageUrl('');
      setDescription('');
      setIsActive(true);
      setHasVariants(false);
      setVariants([]);
      setPhotoNotice(null);
    }
  }, [productToEdit, isOpen]);

  const handleAddVariant = (varName = '', varPrice = 0) => {
    setVariants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: varName || `Varian ${prev.length + 1}`,
        price: varPrice || (parseFloat(price) || 0),
      },
    ]);
  };

  const handleUpdateVariant = (id: string, field: 'name' | 'price', val: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // Presets instan untuk mempermudah admin resto
  const applyDrinkPreset = () => {
    setHasVariants(true);
    const p = parseFloat(price) || 6000;
    setVariants([
      { id: crypto.randomUUID(), name: 'Es / Dingin', price: p },
      { id: crypto.randomUUID(), name: 'Hangat / Panas', price: Math.max(1000, p - 1000) },
      { id: crypto.randomUUID(), name: 'Jumbo Cup (Es)', price: p + 3000 },
    ]);
  };

  const applySnackPackagingPreset = () => {
    setHasVariants(true);
    const p = parseFloat(price) || 16000;
    setVariants([
      { id: crypto.randomUUID(), name: 'Kemasan Pouch (Reguler)', price: p },
      { id: crypto.randomUUID(), name: 'Kemasan Box Sedang', price: Math.round((p * 1.6) / 1000) * 1000 },
      { id: crypto.randomUUID(), name: 'Family Pack / Party Box', price: Math.round((p * 2.8) / 1000) * 1000 },
    ]);
  };

  if (!isOpen) return null;

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoNotice(null);

    try {
      const result = await uploadProductImage(file);
      setImageUrl(result.url);

      if (result.isRemote) {
        setPhotoNotice('Foto berhasil diunggah ke Supabase Cloud Storage!');
      } else if (result.error) {
        setPhotoNotice(result.error);
      } else {
        setPhotoNotice('Foto tersimpan di IndexedDB lokal browser (Mode Offline).');
      }
    } catch (err: any) {
      alert('Gagal mengunggah foto produk: ' + (err?.message || err));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl('');
    setPhotoNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const numPrice = parseFloat(price) || 0;
      const validVariants = hasVariants && variants.length > 0 ? variants : undefined;
      const effectivePrice = validVariants
        ? Math.min(...validVariants.map((v) => v.price))
        : numPrice;

      const productPayload: LocalProduct = {
        id: productToEdit ? productToEdit.id : crypto.randomUUID(),
        name: name.trim(),
        category,
        price: effectivePrice,
        image_url: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
        has_variants: Boolean(validVariants && validVariants.length > 0),
        variants: validVariants,
        created_at: productToEdit?.created_at || nowIso,
        updated_at: nowIso,
      };

      await db.products.put(productPayload);
      syncService.pushProducts().catch(console.warn);

      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan menu: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBase64Image = imageUrl.startsWith('data:');
  const isCloudImage = imageUrl.includes('supabase.co');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-extrabold text-slate-800 text-base">
            {productToEdit ? 'Edit Menu Produk' : 'Tambah Menu Produk Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* 1. Upload Foto Produk Sendiri */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Foto Produk Sendiri *
              </label>
              <button
                type="button"
                onClick={() => setShowManualUrl((prev) => !prev)}
                className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Link className="w-3 h-3" />
                <span>{showManualUrl ? 'Gunakan Upload File' : 'Input URL Web'}</span>
              </button>
            </div>

            {/* Hidden Input File */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoFileChange}
              className="hidden"
            />

            {!showManualUrl ? (
              <div className="p-3 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-2xl transition-all">
                {imageUrl ? (
                  <div className="flex items-center gap-3.5">
                    {/* Thumbnail Foto Menu */}
                    <div className="relative aspect-4/3 w-28 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-2xs shrink-0">
                      <img
                        src={imageUrl}
                        alt="Preview Menu"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md transition shadow-xs"
                        title="Hapus Foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Info & Tombol Ganti */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">Foto Terpasang</span>
                        {isCloudImage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            <Cloud className="w-3 h-3 text-blue-600" />
                            Supabase Cloud
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <HardDrive className="w-3 h-3 text-amber-600" />
                            {isBase64Image ? 'Lokal IndexedDB' : 'Web Link'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Foto ini akan ditampilkan di katalog kasir POS pelanggan.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingPhoto ? (
                            <Loader2 className="w-3 h-3 animate-spin text-orange-600" />
                          ) : (
                            <UploadCloud className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{isUploadingPhoto ? 'Mengunggah...' : 'Ganti Foto'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Area Dropzone Belum Ada Foto */
                  <div
                    onClick={() => !isUploadingPhoto && fileInputRef.current?.click()}
                    className="py-5 flex flex-col items-center justify-center text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 group-hover:bg-orange-200 text-orange-600 flex items-center justify-center mb-2 transition">
                      {isUploadingPhoto ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6" />
                      )}
                    </div>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-orange-600 transition">
                      {isUploadingPhoto
                        ? 'Sedang mengompres & mengunggah foto produk...'
                        : 'Upload Foto Produk Sendiri'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pilih dari galeri foto HP atau komputer kasir (JPG, PNG, WebP)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Input Manual URL */
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            )}

            {photoNotice && (
              <div className="mt-2 text-[11px] text-slate-600 bg-slate-100 p-2 rounded-xl flex items-center gap-1.5 border border-slate-200">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{photoNotice}</span>
              </div>
            )}
          </div>

          {/* 2. Nama Menu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Menu Makanan / Minuman *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Nasi Goreng Spesial"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* 3. Kategori & Harga Jual Dasar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
              >
                <option value="Makanan">Makanan</option>
                <option value="Minuman">Minuman</option>
                <option value="Snack">Snack</option>
                <option value="Dessert">Dessert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {hasVariants ? 'Harga Dasar / Mulai Dari (Rp) *' : 'Harga Jual (Rp) *'}
              </label>
              <input
                type="number"
                required
                min={0}
                step={500}
                placeholder="Contoh: 35000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold"
              />
            </div>
          </div>

          {/* 4. Opsi Varian / Suhu / Kemasan (Harga Berbeda) */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasVariantsCheck"
                  checked={hasVariants}
                  onChange={(e) => {
                    setHasVariants(e.target.checked);
                    if (e.target.checked && variants.length === 0) {
                      if (category === 'Minuman') applyDrinkPreset();
                      else if (category === 'Snack') applySnackPackagingPreset();
                      else handleAddVariant('Porsi Reguler', parseFloat(price) || 20000);
                    }
                  }}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <label
                  htmlFor="hasVariantsCheck"
                  className="text-xs font-bold text-amber-950 cursor-pointer select-none"
                >
                  Aktifkan Pilihan Varian / Suhu / Kemasan (Harga Berbeda)
                </label>
              </div>

              {hasVariants && (
                <button
                  type="button"
                  onClick={() => handleAddVariant()}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-white px-2.5 py-1 rounded-lg border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-2" />
                  <span>Tambah Baris</span>
                </button>
              )}
            </div>

            {hasVariants && (
              <div className="space-y-2.5 pt-1">
                {/* Preset Cepat */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500 font-semibold">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={applyDrinkPreset}
                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition cursor-pointer"
                  >
                    Minuman (Es / Hangat)
                  </button>
                  <button
                    type="button"
                    onClick={applySnackPackagingPreset}
                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition cursor-pointer"
                  >
                    Kemasan Snack (Pouch / Box / Party)
                  </button>
                </div>

                {/* List Varian Input */}
                <div className="space-y-2">
                  {variants.map((v, idx) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200/90 shadow-2xs"
                    >
                      <span className="w-5 text-center text-[10px] font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Nama Varian (misal: Es / Hangat / Box 250g)"
                        value={v.name}
                        onChange={(e) => handleUpdateVariant(v.id, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                      />
                      <div className="relative w-28 sm:w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          Rp
                        </span>
                        <input
                          type="number"
                          step={500}
                          min={0}
                          placeholder="Harga"
                          value={v.price}
                          onChange={(e) =>
                            handleUpdateVariant(v.id, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold text-orange-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus varian ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Deskripsi Menu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Singkat Menu
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan bahan lezat, topping, porsi, atau rasa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* 5. Switch Aktif */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-bold text-slate-700">
              Menu Aktif & Tersedia untuk Dijual di Kasir POS
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingPhoto}
              className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================
   SUB-MODAL 2: ATUR RESEP / BOM (BILL OF MATERIALS)
   ======================================================== */
interface RecipeBOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: LocalProduct | null;
  availableIngredients: Ingredient[];
}

const RecipeBOMModal: React.FC<RecipeBOMModalProps> = ({
  isOpen,
  onClose,
  product,
  availableIngredients,
}) => {
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');

  // Ambil resep untuk produk ini
  const recipes =
    useLiveQuery(async () => {
      if (!product) return [];
      return await db.recipes.where('product_id').equals(product.id).toArray();
    }, [product?.id]) || [];

  if (!isOpen || !product) return null;

  // Hitung perkiraan Total HPP (Bahan Baku)
  const totalCostEstimate = recipes.reduce((sum, r) => {
    const ing = availableIngredients.find((i) => i.id === r.ingredient_id);
    if (!ing) return sum;
    return sum + ing.cost_per_unit * r.quantity;
  }, 0);

  const profitEstimate = product.price - totalCostEstimate;
  const marginEstimate = product.price > 0 ? (profitEstimate / product.price) * 100 : 0;

  const handleAddIngredientToRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(recipeQuantity);
    if (!selectedIngredientId || isNaN(qty) || qty <= 0) return;

    // Cek apakah bahan baku sudah ada di resep
    const existing = recipes.find((r) => r.ingredient_id === selectedIngredientId);
    if (existing) {
      await db.recipes.update(existing.id, {
        quantity: existing.quantity + qty,
      });
    } else {
      const newRecipe: ProductRecipe = {
        id: crypto.randomUUID(),
        product_id: product.id,
        ingredient_id: selectedIngredientId,
        quantity: qty,
      };
      await db.recipes.add(newRecipe);
    }

    syncService.syncRecipes().catch(console.warn);
    setSelectedIngredientId('');
    setRecipeQuantity('');
  };

  const handleRemoveRecipeItem = async (recipeId: string) => {
    await db.recipes.delete(recipeId);
    syncService.syncRecipes().catch(console.warn);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">
                Resep / BOM: {product.name}
              </h3>
              <p className="text-xs text-slate-500">
                Bahan baku yang otomatis dikurangi saat 1 porsi menu ini terjual di kasir.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Form Tambah Bahan ke Resep */}
          <form
            onSubmit={handleAddIngredientToRecipe}
            className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
          >
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Tambah Bahan Baku ke Resep
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">-- Pilih Bahan Baku --</option>
                  {availableIngredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit}) • Sisa Stok: {ing.current_stock.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  placeholder="Jumlah porsi"
                  value={recipeQuantity}
                  onChange={(e) => setRecipeQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!selectedIngredientId || !recipeQuantity}
                  className="w-full h-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-2" />
                </button>
              </div>
            </div>
          </form>

          {/* Daftar Bahan yang Sudah Masuk Resep */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Bahan Terpakai per 1 Porsi ({recipes.length} bahan)
              </span>
            </div>

            {recipes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">Belum ada resep bahan baku</p>
                <p className="text-[11px] text-slate-400">
                  Tambahkan bahan di atas agar stok berkurang otomatis saat menu terjual.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipes.map((r) => {
                  const ing = availableIngredients.find((i) => i.id === r.ingredient_id);
                  const cost = ing ? ing.cost_per_unit * r.quantity : 0;

                  return (
                    <div
                      key={r.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 text-xs block">
                          {ing ? ing.name : 'Bahan tidak dikenal'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {r.quantity} {ing?.unit} • Biaya HPP: {formatRupiah(cost)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeItem(r.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus bahan dari resep"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kalkulasi HPP & Estimasi Laba Kotor */}
          {recipes.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wide block">
                Analisis Finansial Menu
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Harga Jual:</span>
                  <span className="font-bold text-slate-800">{formatRupiah(product.price)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total HPP Bahan:</span>
                  <span className="font-bold text-orange-700">{formatRupiah(totalCostEstimate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Margin Kotor:</span>
                  <span className="font-black text-emerald-700">
                    {marginEstimate.toFixed(1)}% ({formatRupiah(profitEstimate)})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
