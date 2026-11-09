import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import type { LocalProduct, CartItem, ProductCategory } from '../../types';
import { formatRupiah } from '../../lib/utils';
import { Search, X, Plus, Check, UtensilsCrossed, AlertCircle } from 'lucide-react';

interface ProductGridProps {
  cartItems: CartItem[];
  onAddToCart: (product: LocalProduct) => void;
  onOpenVariantModal?: (product: LocalProduct) => void;
}

const CATEGORIES: ProductCategory[] = ['All', 'Makanan', 'Minuman', 'Snack', 'Dessert'];

export const ProductGrid: React.FC<ProductGridProps> = ({
  cartItems,
  onAddToCart,
  onOpenVariantModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('All');

  // Mengambil daftar produk secara reaktif dari IndexedDB via Dexie
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  // Hitung jumlah item tiap kategori
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filter produk berdasarkan kategori dan pencarian nama/deskripsi
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' || product.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Map quantity item yang ada di keranjang untuk badge cepat
  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((item) => {
      map.set(item.product.id, item.quantity);
    });
    return map;
  }, [cartItems]);

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Top Bar: Search & Category Navigation */}
      <div className="p-4 bg-white border-b border-slate-200 space-y-3 sticky top-0 z-10 shadow-2xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari menu makanan, minuman, atau snack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Tab Pill Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] || 0;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30 ring-2 ring-orange-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{category}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid Cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-center text-slate-400 p-6">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
              <UtensilsCrossed className="w-8 h-8 stroke-1.5" />
            </div>
            <p className="font-bold text-slate-800 text-sm">Belum Ada Menu Produk</p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              Katalog menu restoran masih kosong. Silakan masuk sebagai Admin untuk menambahkan produk menu makanan & minuman baru.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 p-6">
            <UtensilsCrossed className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
            <p className="font-medium text-slate-600">Menu tidak ditemukan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-orange-600 font-semibold hover:underline"
              >
                Reset pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => {
              const qtyInCart = cartQuantities.get(product.id) || 0;
              const isAvailable = product.is_active;
              const hasVariants = Boolean(
                (product.variants && product.variants.length > 0) || product.has_variants
              );
              const minVariantPrice =
                product.variants && product.variants.length > 0
                  ? Math.min(...product.variants.map((v) => v.price))
                  : product.price;

              const handleItemClick = (e?: React.MouseEvent) => {
                if (e) {
                  e.stopPropagation();
                }
                if (!isAvailable) return;
                if (hasVariants && onOpenVariantModal) {
                  onOpenVariantModal(product);
                } else {
                  onAddToCart(product);
                }
              };

              return (
                <div
                  key={product.id}
                  onClick={handleItemClick}
                  className={`group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 select-none ${
                    isAvailable
                      ? 'cursor-pointer hover:border-orange-300 hover:-translate-y-0.5 active:translate-y-0'
                      : 'opacity-60 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  {/* Image Container */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                        <UtensilsCrossed className="w-8 h-8" />
                      </div>
                    )}

                    {/* Category Tag & Variant Tag */}
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
                      <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs border border-white/40">
                        {product.category}
                      </span>
                      {hasVariants && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                          {product.variants!.length} Pilihan
                        </span>
                      )}
                    </div>

                    {/* Cart Quantity Badge if already added */}
                    {qtyInCart > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-600 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow-md animate-scale">
                        <Check className="w-3 h-3 stroke-3" />
                        <span>{qtyInCart}</span>
                      </div>
                    )}

                    {/* Out of stock overlay */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-semibold backdrop-blur-2xs">
                        <AlertCircle className="w-4 h-4 mr-1 text-rose-400" />
                        Habis
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Price & Add Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto">
                      <div>
                        {hasVariants && (
                          <span className="text-[9px] text-slate-400 font-medium block">
                            Mulai dari
                          </span>
                        )}
                        <span className="font-bold text-orange-600 text-sm">
                          {formatRupiah(minVariantPrice)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(e);
                        }}
                        className={`px-2 py-1 rounded-lg flex items-center justify-center transition-all text-xs font-bold ${
                          hasVariants
                            ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                            : qtyInCart > 0
                            ? 'bg-orange-500 text-white shadow-xs w-7 h-7'
                            : 'bg-slate-100 text-slate-700 hover:bg-orange-500 hover:text-white w-7 h-7'
                        }`}
                        title={hasVariants ? 'Pilih Varian' : 'Tambahkan ke Keranjang'}
                      >
                        {hasVariants ? (
                          <span>Pilih</span>
                        ) : (
                          <Plus className="w-4 h-4 stroke-2" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
