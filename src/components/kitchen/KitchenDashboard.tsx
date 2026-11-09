import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import type { LocalOrder, KitchenStatus, RestaurantSettings, StaffUser } from '../../types';
import { InventoryView } from '../admin/InventoryView';
import {
  ChefHat,
  Boxes,
  Clock,
  CheckCircle2,
  Play,
  Check,
  Utensils,
  LogOut,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

interface KitchenDashboardProps {
  settings: RestaurantSettings | null;
  currentStaff: StaffUser | null;
  onLogout: () => void;
  onReturnToAdmin?: () => void;
}

type KitchenTab = 'orders' | 'inventory';
type StatusFilter = 'active' | 'pending' | 'cooking' | 'ready' | 'all';

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({
  settings,
  currentStaff,
  onLogout,
  onReturnToAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<KitchenTab>('orders');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Ambil semua transaksi secara reaktif dari IndexedDB
  const orders = useLiveQuery(() => db.orders.orderBy('created_at').reverse().toArray(), []) || [];

  // Hitung status pesanan untuk badge dapur
  const counts = useMemo(() => {
    let pending = 0;
    let cooking = 0;
    let ready = 0;
    orders.forEach((o) => {
      const status = o.kitchen_status || 'pending';
      if (status === 'pending') pending++;
      else if (status === 'cooking') cooking++;
      else if (status === 'ready') ready++;
    });
    return { pending, cooking, ready, active: pending + cooking };
  }, [orders]);

  // Filter daftar pesanan yang ditampilkan
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const status = o.kitchen_status || 'pending';
      if (statusFilter === 'active') {
        return status === 'pending' || status === 'cooking';
      }
      if (statusFilter === 'all') return true;
      return status === statusFilter;
    });
  }, [orders, statusFilter]);

  // Update status memasak tiket pesanan
  const handleUpdateStatus = async (orderId: string, nextStatus: KitchenStatus) => {
    try {
      await db.orders.update(orderId, {
        kitchen_status: nextStatus,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating kitchen status:', err);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} jam lalu`;
  };

  const isAdmin = currentStaff?.role === 'admin';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Top Application Bar Khusus Dapur (Light Mode Modern) */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 shadow-2xs">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.name}
              className="w-10 h-10 object-contain border-0 shadow-none bg-transparent"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <ChefHat className="w-5 h-5 stroke-2" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                {settings?.name || 'Gastro Resto'}
              </h1>
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                Layar Dapur (KDS)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {currentStaff ? `Staf Masak: ${currentStaff.name}` : 'Kitchen Display System'}
            </p>
          </div>
        </div>

        {/* Center: Tabs Switcher (Tiket Pesanan vs Stok Bahan) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="w-4 h-4 text-emerald-600" />
            <span>Tiket Pesanan</span>
            {counts.active > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
                {counts.active}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-600" />
            <span>Stok Bahan Baku</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Jika admin yang sedang meninjau dapur, berikan tombol kembali ke dashboard */}
          {isAdmin && onReturnToAdmin && (
            <button
              type="button"
              onClick={onReturnToAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer shadow-xs"
              title="Kembali ke Back-Office Admin"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Kembali ke Admin</span>
            </button>
          )}

          {/* Tombol Logout / Keluar ke Halaman Login */}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold transition border border-slate-200 cursor-pointer"
            title="Keluar dari sesi dapur ke halaman login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Kitchen Content Area (Light Mode) */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'orders' ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
            {/* Filter Bar Tiket Pesanan */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'active'
                      ? 'bg-amber-500 text-white font-black shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Perlu Dimasak</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === 'active'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {counts.active}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'pending'
                      ? 'bg-rose-600 text-white font-black shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Menunggu ({counts.pending})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('cooking')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'cooking'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Sedang Dimasak ({counts.cooking})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('ready')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'ready'
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Siap Saji ({counts.ready})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>Semua</span>
                </button>
              </div>

              <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Antrian Dapur</span>
              </div>
            </div>

            {/* Grid Kartu Tiket Pesanan Dapur (Light Mode Cards) */}
            <div className="flex-1 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-base">Tidak Ada Tiket Masak</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Saat kasir menyelesaikan transaksi di POS, pesanan makanan dan minuman akan otomatis muncul di layar ini secara real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-6">
                  {filteredOrders.map((order) => {
                    const status: KitchenStatus = order.kitchen_status || 'pending';
                    const isDineIn = order.order_type === 'dine_in';

                    return (
                      <div
                        key={order.id}
                        className={`bg-white rounded-3xl border flex flex-col justify-between overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md ${
                          status === 'pending'
                            ? 'border-rose-300 ring-2 ring-rose-500/10'
                            : status === 'cooking'
                            ? 'border-blue-300 ring-2 ring-blue-500/10'
                            : status === 'ready'
                            ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                            : 'border-slate-200 opacity-60'
                        }`}
                      >
                        {/* Header Tiket */}
                        <div
                          className={`p-3.5 border-b flex items-center justify-between ${
                            status === 'pending'
                              ? 'bg-rose-50/70 border-rose-100'
                              : status === 'cooking'
                              ? 'bg-blue-50/70 border-blue-100'
                              : status === 'ready'
                              ? 'bg-emerald-50/70 border-emerald-100'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm tracking-wide font-mono">
                                {order.invoice_number}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  isDineIn
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                              >
                                {isDineIn ? `Meja ${order.table_number || '-'}` : 'Bungkus / Takeaway'}
                              </span>
                            </div>
                            {order.customer_name && (
                              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                                Pelanggan: {order.customer_name}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono justify-end">
                              <Clock className="w-3 h-3" />
                              {getTimeAgo(order.created_at)}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                                status === 'pending'
                                  ? 'bg-rose-600 text-white'
                                  : status === 'cooking'
                                  ? 'bg-blue-600 text-white'
                                  : status === 'ready'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {status === 'pending'
                                ? 'Menunggu'
                                : status === 'cooking'
                                ? 'Sedang Dimasak'
                                : status === 'ready'
                                ? 'Siap Saji'
                                : 'Selesai'}
                            </span>
                          </div>
                        </div>

                        {/* Body Item Pesanan */}
                        <div className="p-4 flex-1 space-y-3 divide-y divide-slate-100">
                          {order.items.map((item, idx) => (
                            <div key={idx} className={idx > 0 ? 'pt-2.5' : ''}>
                              <div className="flex items-start gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                                  {item.quantity}x
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                                    {item.product_name}
                                  </h4>
                                  {item.variant_name && (
                                    <span className="inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mt-0.5">
                                      {item.variant_name}
                                    </span>
                                  )}
                                  {item.notes && (
                                    <div className="mt-1 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                                      ⚠️ {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer Controls Aksi Koki */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                          {status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'cooking')}
                              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Mulai Masak</span>
                            </button>
                          )}

                          {status === 'cooking' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-4 h-4 stroke-2" />
                              <span>Siap Saji</span>
                            </button>
                          )}

                          {status === 'ready' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(order.id, 'served')}
                              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <Check className="w-4 h-4 stroke-2" />
                              <span>Selesai Disajikan</span>
                            </button>
                          )}

                          {status === 'served' && (
                            <div className="w-full text-center text-xs text-slate-400 font-semibold py-1">
                              Pesanan Selesai
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Stok Bahan Baku Dapur (Read-Only) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 text-slate-900">
            <div className="max-w-6xl mx-auto">
              <InventoryView readOnly={true} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
