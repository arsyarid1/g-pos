import React, { useState, useEffect } from 'react';
import type { LocalProduct, ProductVariant } from '../../types';
import { formatRupiah } from '../../lib/utils';
import { X, Check, Plus, Minus, MessageSquare, ShoppingBag } from 'lucide-react';

interface ProductVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: LocalProduct | null;
  onAddToCart: (
    product: LocalProduct,
    variant: ProductVariant,
    quantity: number,
    notes: string
  ) => void;
}

export const ProductVariantModal: React.FC<ProductVariantModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const activeVariants: ProductVariant[] =
    product?.variants && product.variants.length > 0
      ? product.variants
      : product
      ? [{ id: 'var-default', name: 'Standar / Porsi Biasa', price: product.price }]
      : [];

  useEffect(() => {
    if (product) {
      const vars =
        product.variants && product.variants.length > 0
          ? product.variants
          : [{ id: 'var-default', name: 'Standar / Porsi Biasa', price: product.price }];
      setSelectedVariant(vars[0]);
      setQuantity(1);
      setNotes('');
    } else {
      setSelectedVariant(null);
      setQuantity(1);
      setNotes('');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) {
    return null;
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const totalPrice = currentPrice * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    onAddToCart(product, selectedVariant, quantity, notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Product Preview */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src={
                product.image_url ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'
              }
              alt={product.name}
              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">
                {product.category}
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                {product.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Pilihan Varian */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Pilih Varian / Suhu / Kemasan *
            </label>

            <div className="grid grid-cols-1 gap-2">
              {activeVariants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;

                return (
                  <div
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/60 text-orange-950 shadow-xs ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-orange-600 border-orange-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-3" />}
                      </div>
                      <span className="font-bold text-xs sm:text-sm">
                        {variant.name}
                      </span>
                    </div>

                    <span className="font-extrabold text-xs sm:text-sm text-orange-600">
                      {formatRupiah(variant.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stepper Jumlah Qty */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Jumlah Porsi:</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="w-8 text-center font-black text-sm text-slate-900">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 active:scale-95 transition shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-2" />
              </button>
            </div>
          </div>

          {/* Catatan Khusus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Catatan Khusus (Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Gula sedikit, tanpa es batu, ekstra sambal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedVariant}
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl transition shadow-md shadow-orange-500/25 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Tambahkan ke Pesanan</span>
              </div>
              <span className="font-extrabold">{formatRupiah(totalPrice)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
