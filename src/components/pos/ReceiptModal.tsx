import React, { useState } from 'react';
import type { LocalOrder, RestaurantSettings } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { Printer, CheckCircle, X, Sparkles, PlusCircle } from 'lucide-react';

interface ReceiptModalProps {
  order: LocalOrder | null;
  onClose: () => void;
  onNewOrder?: () => void;
  isReprint?: boolean;
  settings?: RestaurantSettings | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  onClose,
  onNewOrder,
  isReprint = false,
  settings,
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('80mm');

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const restoName = settings?.name || 'GASTRO RESTO & CAFE';
  const restoTagline = settings?.tagline || 'Rasa Autentik Nusantara';
  const restoAddress = settings?.address || 'Jl. Kuliner Nusantara No. 88, Jakarta';
  const restoPhone = settings?.phone || '0812-3456-7890';
  const receiptFooter = settings?.receipt_footer || 'Terima Kasih Atas Kunjungan Anda!\nStruk ini merupakan bukti pembayaran yang sah.';
  const taxPercent = settings?.tax_percentage ?? 10;

  const handleNewOrder = () => {
    if (onNewOrder) {
      onNewOrder();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/80 rounded-xl">
              {isReprint ? (
                <Printer className="w-5 h-5 text-white" />
              ) : (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {isReprint ? 'Cetak Ulang Struk Kasir' : 'Pesanan Sukses & Disimpan!'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {isReprint
                  ? `Invoice: ${order.invoice_number}`
                  : 'Transaksi tercatat di database lokal Dexie.js'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-emerald-700/50 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Selector & Quick Notice */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Ukuran Kertas Thermal:</span>
          </div>

          <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPaperSize('58mm')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                paperSize === '58mm'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58mm (Kecil)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('80mm')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                paperSize === '80mm'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm (Standar)
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center items-start">
          <div
            id="printable-thermal-receipt"
            className={`paper-${paperSize} bg-white p-4 sm:p-5 shadow-md border border-slate-300 font-mono text-slate-900 transition-all duration-200 ${
              paperSize === '58mm'
                ? 'w-[260px] max-w-[260px] text-[11px] leading-tight'
                : 'w-[340px] max-w-[340px] text-xs leading-normal'
            }`}
          >
            {/* 1. Header Restoran */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-400 space-y-1">
              {settings?.logo_url && (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={settings.logo_url}
                    alt={restoName}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-none border-0 shadow-none bg-transparent"
                  />
                </div>
              )}
              <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-slate-900">
                {restoName}
              </h2>
              {restoTagline && (
                <p className="text-[10px] text-slate-600 font-medium">
                  {restoTagline}
                </p>
              )}
              <p className="text-[10px] text-slate-500">
                {restoAddress}
              </p>
              <p className="text-[10px] text-slate-500">Telp: {restoPhone}</p>
            </div>

            {/* 2. Metadata Transaksi */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Invoice:</span>
                <span className="font-bold">{order.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal:</span>
                <span>{formatDateIndo(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span>Kasir 01</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipe Pesanan:</span>
                <span className="font-bold uppercase text-slate-900">
                  {order.order_type === 'dine_in'
                    ? `DINE-IN (MEJA ${order.table_number || '-'})`
                    : 'TAKEAWAY (BUNGKUS)'}
                </span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-medium">{order.customer_name}</span>
                </div>
              )}
            </div>

            {/* 3. Rincian Item Pesanan */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
              <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between items-baseline gap-1">
                    <span className="font-bold text-slate-900 flex-1 leading-snug">
                      {item.product_name}
                    </span>
                    <span className="font-semibold text-right whitespace-nowrap">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-orange-700 italic pl-1 bg-orange-50/60 rounded">
                      *{item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 4. Rincian Tagihan & Pembayaran */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pajak PB1 ({taxPercent}%):</span>
                <span>{formatRupiah(order.tax)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm sm:text-base pt-1.5 border-t border-slate-300 text-slate-900">
                <span>TOTAL:</span>
                <span>{formatRupiah(order.total)}</span>
              </div>

              {/* Rincian Bayar */}
              <div className="pt-2 border-t border-dashed border-slate-200 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 capitalize">
                    Metode: {order.payment_method === 'cash' ? 'Tunai (Cash)' : order.payment_method.toUpperCase()}
                  </span>
                  <span>{formatRupiah(order.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(order.change_amount)}</span>
                </div>
              </div>
            </div>

            {/* 5. Footer Struk */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-slate-500 whitespace-pre-line">
              <div className="flex items-center justify-center gap-1 font-bold text-slate-700">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{receiptFooter.split('\n')[0]}</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </div>
              {receiptFooter.split('\n').slice(1).map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
              <p className="text-[9px] text-slate-400 font-mono tracking-wider pt-1">
                *** {restoName.toUpperCase()} ***
              </p>
              <div className="text-[9px] text-slate-400">
                Status Sync: <span className="font-bold uppercase">{order.sync_status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-2" />
            <span>Cetak Struk Thermal ({paperSize})</span>
          </button>

          <button
            type="button"
            onClick={handleNewOrder}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-orange-500/25 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 stroke-2" />
            <span>Pesanan Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
