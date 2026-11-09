import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import type { LocalOrder, SyncStatus } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import {
  X,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  ShoppingBag,
  Utensils,
  RefreshCw,
  RotateCcw,
  Receipt,
  Search,
} from 'lucide-react';

interface OrderHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt: (order: LocalOrder) => void;
  onSyncAll: () => Promise<any>;
  onSyncSingle: (orderId: string) => Promise<boolean>;
  isSyncing: boolean;
}

export const OrderHistoryDrawer: React.FC<OrderHistoryDrawerProps> = ({
  isOpen,
  onClose,
  onViewReceipt,
  onSyncAll,
  onSyncSingle,
  isSyncing,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | SyncStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  // Hook reaktif Dexie useLiveQuery: otomatis update tampilan saat DB berubah
  const orders =
    useLiveQuery(async () => {
      return await db.orders.orderBy('created_at').reverse().toArray();
    }, []) || [];

  const pendingCount = orders.filter((o) => o.sync_status === 'pending').length;
  const syncedCount = orders.filter((o) => o.sync_status === 'synced').length;
  const failedCount = orders.filter((o) => o.sync_status === 'failed').length;

  const totalOmzet = orders.reduce((sum, o) => sum + o.total, 0);

  // Filter list
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filterStatus === 'all' || order.sync_status === filterStatus;
    const matchesSearch =
      searchQuery.trim() === '' ||
      order.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.table_number && order.table_number.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleRetryOrder = async (orderId: string) => {
    setRetryingOrderId(orderId);
    try {
      await onSyncSingle(orderId);
    } finally {
      setRetryingOrderId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        {/* Drawer Panel */}
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-in-out">
          {/* Header Drawer */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <span>Riwayat Transaksi & Sync</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tersimpan di IndexedDB • Total {orders.length} order
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              title="Tutup Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions & Search */}
          <div className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no. invoice, meja, atau nama pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Filter Pills & Sync All Button */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({orders.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    filterStatus === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Pending ({pendingCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('synced')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    filterStatus === 'synced'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Synced ({syncedCount})</span>
                </button>

                {failedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterStatus('failed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                      filterStatus === 'failed'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Failed ({failedCount})</span>
                  </button>
                )}
              </div>

              {/* Sync Semua button */}
              {(pendingCount > 0 || failedCount > 0) && (
                <button
                  type="button"
                  onClick={() => onSyncAll()}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Kirim semua transaksi pending ke Supabase"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Semua'}</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Orders */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Receipt className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Tidak ada transaksi</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {searchQuery
                    ? 'Tidak ada pesanan yang sesuai dengan kata kunci pencarian.'
                    : 'Belum ada transaksi pada kategori filter ini.'}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isThisOrderRetrying = retryingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition space-y-3"
                  >
                    {/* Top Row: Invoice, Time & Sync Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 font-mono">
                            {order.invoice_number}
                          </span>

                          {/* Dynamic Sync Status Badge */}
                          {order.sync_status === 'synced' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-2" />
                              <span>Synced</span>
                            </span>
                          )}

                          {order.sync_status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Sync</span>
                            </span>
                          )}

                          {order.sync_status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Failed</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatDateIndo(order.created_at)}
                        </p>
                      </div>

                      {/* Total Nominal */}
                      <div className="text-right">
                        <span className="font-extrabold text-base text-orange-600 block">
                          {formatRupiah(order.total)}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {order.payment_method === 'cash' ? 'Tunai' : order.payment_method}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Order Info */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        {order.order_type === 'dine_in' ? (
                          <>
                            <Utensils className="w-3.5 h-3.5 text-orange-500" />
                            <span>Meja {order.table_number || '-'}</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                            <span>Takeaway</span>
                          </>
                        )}
                      </span>

                      {order.customer_name && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[140px]">
                            {order.customer_name}
                          </span>
                        </>
                      )}

                      <span className="text-slate-300">•</span>
                      <span>{order.items.length} macam menu</span>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      {/* Tombol Cetak / Lihat Struk */}
                      <button
                        type="button"
                        onClick={() => onViewReceipt(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Lihat / Cetak Struk</span>
                      </button>

                      {/* Tombol Sync Ulang (jika pending / failed) */}
                      {order.sync_status !== 'synced' && (
                        <button
                          type="button"
                          disabled={isThisOrderRetrying || isSyncing}
                          onClick={() => handleRetryOrder(order.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                          title="Kirim transaksi ini ke server Supabase"
                        >
                          <RotateCcw
                            className={`w-3.5 h-3.5 ${
                              isThisOrderRetrying ? 'animate-spin' : ''
                            }`}
                          />
                          <span>
                            {isThisOrderRetrying ? 'Mengirim...' : 'Sync Ulang'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Statistics */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div>
              <span className="text-slate-400">Total Transaksi: </span>
              <span className="font-bold text-slate-800">{orders.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Omset: </span>
              <span className="font-black text-slate-900 text-sm">
                {formatRupiah(totalOmzet)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
