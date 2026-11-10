import React, { useState } from 'react';
import type { CartItem, OrderType } from '../../types';
import { formatRupiah } from '../../lib/utils';
import {
  ShoppingBag,
  Utensils,
  Trash2,
  Plus,
  Minus,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  User,
  Hash,
} from 'lucide-react';

interface CartProps {
  cartItems: CartItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onUpdateNotes: (cartItemId: string, notes: string) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
  taxPercentage?: number;
  onBackToMenu?: () => void;
}

export const Cart: React.FC<CartProps> = ({
  cartItems,
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onClearCart,
  onOpenCheckout,
  taxPercentage = 10,
  onBackToMenu,
}) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.variant ? item.variant.price : item.product.price) * item.quantity,
    0
  );
  const tax = Math.round(subtotal * (taxPercentage / 100)); // PB1
  const total = subtotal + tax;

  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header: Order Type Selector & Table / Customer Input */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Kembali ke Daftar Menu"
              >
                <ArrowLeft className="w-4 h-4 text-orange-600" />
                <span>Menu</span>
              </button>
            )}
            <h3 className="font-bold text-slate-800 text-base">Pesanan Aktif</h3>
            {totalItemCount > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItemCount} item
              </span>
            )}
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-rose-500 hover:text-rose-700 hover:underline font-medium inline-flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Keranjang
            </button>
          )}
        </div>

        {/* Dine-In / Takeaway Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              orderType === 'dine_in'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dine-In (Makan di Tempat)</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderType('takeaway')}
            className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              orderType === 'takeaway'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Takeaway (Bungkus)</span>
          </button>
        </div>

        {/* Input Nomor Meja & Nama Pelanggan */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {orderType === 'dine_in' && (
            <div>
              <label className="block text-slate-500 font-medium mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" />
                Nomor Meja *
              </label>
              <input
                type="text"
                placeholder="Contoh: 08"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          )}

          <div className={orderType === 'takeaway' ? 'col-span-2' : ''}>
            <label className="block text-slate-500 font-medium mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              Nama Pelanggan (opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Pak Budi"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6 space-y-2">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-400">
              <ShoppingBag className="w-8 h-8 stroke-1.5" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">Keranjang Masih Kosong</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Pilih menu dari katalog di sebelah kiri untuk menambahkan pesanan ke daftar ini.
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const itemId = item.cartItemId || `${item.product.id}-${item.variant ? item.variant.id : 'default'}`;
            const isEditingNote = activeNoteId === itemId;
            const unitPrice = item.variant ? item.variant.price : item.product.price;
            const itemSubtotal = unitPrice * item.quantity;

            return (
              <div
                key={itemId}
                className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-slate-800 truncate">
                      {item.product.name}
                    </h5>

                    {/* Badge Varian (jika ada pilihan varian) */}
                    {item.variant && (
                      <span className="inline-block text-[10px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md mt-0.5 border border-orange-200/60">
                        {item.variant.name}
                      </span>
                    )}

                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatRupiah(unitPrice)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Subtotal Item */}
                    <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                      {formatRupiah(itemSubtotal)}
                    </span>

                    {/* Tombol Hapus Langsung */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(itemId);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus menu dari keranjang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Controls: Stepper & Note button */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveNoteId(isEditingNote ? null : itemId)
                    }
                    className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
                      item.notes
                        ? 'bg-amber-100 text-amber-800 font-medium'
                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{item.notes ? item.notes : 'Tambah Catatan'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Decrement button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateQuantity(itemId, -1);
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                      title={item.quantity === 1 ? 'Hapus' : 'Kurangi jumlah'}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <span className="w-8 text-center font-bold text-xs text-slate-800">
                      {item.quantity}
                    </span>

                    {/* Increment button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateQuantity(itemId, 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                      title="Tambah jumlah"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-2" />
                    </button>
                  </div>
                </div>

                {/* Note Editor Dropdown */}
                {isEditingNote && (
                  <div className="pt-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Contoh: Dingin tanpa es batu, pedas manis..."
                      value={item.notes}
                      onChange={(e) => onUpdateNotes(itemId, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setActiveNoteId(null);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary Pembayaran & Checkout Button */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-3">
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">{formatRupiah(subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Pajak Restoran (PB1 {taxPercentage}%)</span>
            <span className="font-semibold text-slate-800">{formatRupiah(tax)}</span>
          </div>

          <div className="h-px bg-slate-200 my-1" />

          <div className="flex justify-between items-baseline pt-1">
            <span className="font-bold text-slate-900 text-sm">Total Akhir</span>
            <span className="font-extrabold text-orange-600 text-lg">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        {/* Tombol Checkout */}
        <button
          type="button"
          disabled={cartItems.length === 0 || (orderType === 'dine_in' && !tableNumber.trim())}
          onClick={onOpenCheckout}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Lanjutkan ke Pembayaran</span>
          <ArrowRight className="w-4 h-4 stroke-2" />
        </button>

        {orderType === 'dine_in' && !tableNumber.trim() && cartItems.length > 0 && (
          <p className="text-[11px] text-rose-500 text-center font-medium">
            * Harap masukkan nomor meja sebelum checkout
          </p>
        )}
      </div>
    </div>
  );
};
