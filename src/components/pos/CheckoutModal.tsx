import React, { useState, useMemo, useEffect } from 'react';
import type { CartItem, OrderType, PaymentMethod, LocalOrder, LocalOrderItem } from '../../types';
import { db, deductIngredientsForOrder } from '../../lib/db';
import { syncService } from '../../services/syncService';
import { formatRupiah, generateInvoiceNumber } from '../../lib/utils';
import {
  X,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Receipt,
  RotateCcw,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  orderType: OrderType;
  tableNumber: string;
  customerName: string;
  onOrderCompleted: (order: LocalOrder) => void;
  taxPercentage?: number;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  orderType,
  tableNumber,
  customerName,
  onOrderCompleted,
  taxPercentage = 10,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [cardRefNumber, setCardRefNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + (item.variant ? item.variant.price : item.product.price) * item.quantity,
        0
      ),
    [cartItems]
  );
  const tax = useMemo(
    () => Math.round(subtotal * (taxPercentage / 100)),
    [subtotal, taxPercentage]
  );
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  // Set default cash amount to exact total when modal opens
  useEffect(() => {
    if (isOpen) {
      setCashAmountStr(total.toString());
      setPaymentMethod('cash');
      setCardRefNumber('');
      setIsSubmitting(false);
    }
  }, [isOpen, total]);

  const cashAmount = parseFloat(cashAmountStr) || 0;
  const changeAmount = cashAmount >= total ? cashAmount - total : 0;
  const isCashInsufficient = paymentMethod === 'cash' && cashAmount < total;

  // Tombol pecahan uang cepat
  const quickCashOptions = useMemo(() => {
    const list: number[] = [total]; // Uang pas

    [20000, 50000, 100000, 200000, 500000].forEach((val) => {
      if (val >= total && !list.includes(val)) {
        list.push(val);
      }
    });

    // Tambahkan kelipatan 50.000 atau 100.000 berikutnya jika total lebih besar
    if (total > 100000) {
      const next50k = Math.ceil(total / 50000) * 50000;
      if (!list.includes(next50k)) list.push(next50k);
      const next100k = Math.ceil(total / 100000) * 100000;
      if (!list.includes(next100k)) list.push(next100k);
    }

    return list.sort((a, b) => a - b).slice(0, 5);
  }, [total]);

  if (!isOpen) return null;

  const handleCompleteOrder = async () => {
    if (isSubmitting) return;
    if (paymentMethod === 'cash' && isCashInsufficient) return;

    setIsSubmitting(true);
    try {
      const orderId = crypto.randomUUID();
      const invoiceNumber = generateInvoiceNumber();
      const nowIso = new Date().toISOString();

      const items: LocalOrderItem[] = cartItems.map((cart) => {
        const unitPrice = cart.variant ? cart.variant.price : cart.product.price;
        const displayName = cart.variant
          ? `${cart.product.name} (${cart.variant.name})`
          : cart.product.name;

        return {
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: cart.product.id,
          product_name: displayName,
          variant_id: cart.variant?.id,
          variant_name: cart.variant?.name,
          quantity: cart.quantity,
          unit_price: unitPrice,
          subtotal: unitPrice * cart.quantity,
          notes: cart.notes || undefined,
        };
      });

      const finalAmountPaid =
        paymentMethod === 'cash' ? cashAmount : total;
      const finalChangeAmount =
        paymentMethod === 'cash' ? changeAmount : 0;

      const newOrder: LocalOrder = {
        id: orderId,
        invoice_number: invoiceNumber,
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber.trim() : null,
        customer_name: customerName.trim() || null,
        items,
        subtotal,
        tax,
        total,
        payment_method: paymentMethod,
        amount_paid: finalAmountPaid,
        change_amount: finalChangeAmount,
        kitchen_status: 'pending',
        sync_status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      };

      // Simpan langsung ke Dexie IndexedDB
      await db.orders.add(newOrder);

      // Kurangi stok bahan baku otomatis berdasarkan BOM / Resep
      await deductIngredientsForOrder(newOrder);

      // Trigger sync di background secara non-blocking
      syncService.syncAll().catch((err) => {
        console.warn('Background sync on checkout error:', err);
      });

      // Beritahu parent component
      onOrderCompleted(newOrder);
      onClose();
    } catch (err: any) {
      console.error('Gagal menyimpan pesanan:', err);
      alert('Gagal menyelesaikan pesanan: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Pembayaran & Checkout</h3>
              <p className="text-xs text-slate-500">
                {orderType === 'dine_in' ? `Dine-In • Meja ${tableNumber}` : 'Takeaway (Bawa Pulang)'}
                {customerName ? ` • ${customerName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Total Tagihan Box */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                Total Tagihan
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)} item menu (Termasuk Pajak PB1 10%)
              </p>
            </div>
            <span className="text-2xl font-black text-orange-600">
              {formatRupiah(total)}
            </span>
          </div>

          {/* Metode Pembayaran Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Cash */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700 ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Tunai (Cash)</span>
              </button>

              {/* QRIS */}
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'qris'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700 ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QRIS Instant</span>
              </button>

              {/* Card */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-orange-500 bg-orange-50/50 text-orange-700 ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Kartu / EDC</span>
              </button>
            </div>
          </div>

          {/* Skenario 1: Cash / Tunai */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* Tombol Pecahan Cepat */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Pecahan Cepat Uang Diterima:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickCashOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCashAmountStr(opt.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                        cashAmount === opt
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {opt === total ? `Uang Pas (${formatRupiah(opt)})` : formatRupiah(opt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Uang Diterima */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Uang Diterima (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={cashAmountStr}
                    onChange={(e) => setCashAmountStr(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-base font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Hasil Kalkulator Kembalian */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isCashInsufficient
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCashInsufficient ? (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-semibold block">
                      {isCashInsufficient ? 'Uang Belum Cukup' : 'Uang Kembalian'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {isCashInsufficient
                        ? `Kurang ${formatRupiah(total - cashAmount)}`
                        : 'Serahkan kembalian ke pelanggan'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-lg font-black ${
                    isCashInsufficient ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {isCashInsufficient ? `-${formatRupiah(total - cashAmount)}` : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Skenario 2: QRIS */}
          {paymentMethod === 'qris' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center">
                <div className="text-[11px] font-black tracking-widest text-slate-800 mb-1">
                  QRIS STANDAR PEMBAYARAN NASIONAL
                </div>
                {/* SVG Mock QR Code */}
                <div className="w-44 h-44 bg-slate-900 rounded-lg p-2 flex items-center justify-center text-white">
                  <div className="w-full h-full border-4 border-dashed border-white/60 flex flex-col items-center justify-center gap-2">
                    <QrCode className="w-20 h-20 text-white" />
                    <span className="text-[10px] font-mono tracking-wider font-semibold">
                      SCAN TO PAY
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-bold text-slate-700">
                  {formatRupiah(total)}
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Minta pelanggan scan QRIS dengan GoPay, OVO, Dana, BCA, atau aplikasi m-Banking apa pun.
              </p>
            </div>
          )}

          {/* Skenario 3: Card EDC */}
          {paymentMethod === 'card' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Nomor Referensi EDC / Approval Code
              </label>
              <input
                type="text"
                placeholder="Contoh: REF-88910243"
                value={cardRefNumber}
                onChange={(e) => setCardRefNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <p className="text-xs text-slate-500">
                Gesek atau masukkan kartu ke mesin EDC fisik, lalu salin nomor approval di sini untuk pembukuan.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isSubmitting || (paymentMethod === 'cash' && isCashInsufficient)}
            onClick={handleCompleteOrder}
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Menyimpan Pesanan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesaikan Pesanan & Bayar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
