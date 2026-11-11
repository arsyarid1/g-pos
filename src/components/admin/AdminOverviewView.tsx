import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllMenuAndInventory } from '../../lib/db';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { LocalOrder, Ingredient } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Banknote,
  Utensils,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ChefHat,
  Eye,
  Database,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface AdminOverviewViewProps {
  onNavigateTab: (tab: 'menu' | 'inventory' | 'staff' | 'settings') => void;
  onViewReceipt: (order: LocalOrder) => void;
  onOpenPOS?: () => void;
  onOpenKitchen?: () => void;
}

type DateFilter = 'today' | '7days' | '30days' | 'all';

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({
  onNavigateTab,
  onViewReceipt,
  onOpenPOS,
  onOpenKitchen,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  // Ambil data transaksi, bahan baku, dan menu secara reaktif dari IndexedDB
  const orders = useLiveQuery(() => db.orders.orderBy('created_at').reverse().toArray(), []) || [];
  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus('Menguji koneksi ke cloud...');
    const start = Date.now();
    try {
      if (!isSupabaseConfigured || !supabase) {
        setSupabaseTestStatus('❌ Supabase belum terkonfigurasi di .env');
        return;
      }
      const { data, error } = await supabase.from('restaurant_settings').select('*').limit(1);
      const elapsed = Date.now() - start;
      if (error) {
        setSupabaseTestStatus(`❌ Respon error: ${error.message} (${elapsed}ms)`);
      } else {
        setSupabaseTestStatus(`✅ Terhubung Sukses ke Supabase Cloud (${elapsed}ms)!`);
      }
    } catch (e: any) {
      setSupabaseTestStatus(`❌ Koneksi gagal: ${e?.message || e}`);
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleClearAllData = async () => {
    if (confirm('Konfirmasi: Anda yakin ingin mengosongkan seluruh menu produk dan bahan baku demo? Akun user staf (Admin/Kasir/Dapur) TIDAK akan terhapus.')) {
      setIsClearingData(true);
      try {
        await clearAllMenuAndInventory();
        alert('Berhasil! Seluruh produk dan bahan baku demo telah dibersihkan. Anda sekarang dapat mendaftarkan menu riil restoran Anda.');
      } catch (e: any) {
        alert('Gagal membersihkan data: ' + (e?.message || e));
      } finally {
        setIsClearingData(false);
      }
    }
  };

  // Filter orders berdasarkan rentang tanggal terpilih
  const filteredOrders = useMemo(() => {
    if (dateFilter === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return orders.filter((order) => {
      const orderTime = new Date(order.created_at).getTime();
      if (dateFilter === 'today') {
        return orderTime >= startOfToday;
      }
      if (dateFilter === '7days') {
        const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
        return orderTime >= sevenDaysAgo;
      }
      if (dateFilter === '30days') {
        const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;
        return orderTime >= thirtyDaysAgo;
      }
      return true;
    });
  }, [orders, dateFilter]);

  // Kalkulasi Metrik Finansial
  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + order.total, 0);
  }, [filteredOrders]);

  const totalSubtotal = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + order.subtotal, 0);
  }, [filteredOrders]);

  const totalTax = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + order.tax, 0);
  }, [filteredOrders]);

  const totalTransactions = filteredOrders.length;

  const averageOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Breakdown Metode Pembayaran
  const paymentBreakdown = useMemo(() => {
    const counts = { cash: 0, qris: 0, card: 0 };
    const amounts = { cash: 0, qris: 0, card: 0 };

    filteredOrders.forEach((order) => {
      const method = order.payment_method;
      if (method in counts) {
        counts[method as keyof typeof counts]++;
        amounts[method as keyof typeof amounts] += order.total;
      }
    });

    return { counts, amounts };
  }, [filteredOrders]);

  // Breakdown Tipe Pesanan (Dine-in vs Takeaway)
  const orderTypeBreakdown = useMemo(() => {
    let dineInCount = 0;
    let takeawayCount = 0;
    filteredOrders.forEach((order) => {
      if (order.order_type === 'dine_in') dineInCount++;
      else takeawayCount++;
    });
    return { dineInCount, takeawayCount };
  }, [filteredOrders]);

  // Top 5 Menu Paling Laris
  const topSellingProducts = useMemo(() => {
    const productSalesMap = new Map<
      string,
      { name: string; variantName?: string; qty: number; totalNominal: number }
    >();

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = `${item.product_id}-${item.variant_id || 'default'}`;
        const existing = productSalesMap.get(key);
        if (existing) {
          existing.qty += item.quantity;
          existing.totalNominal += item.subtotal;
        } else {
          productSalesMap.set(key, {
            name: item.product_name,
            variantName: item.variant_name,
            qty: item.quantity,
            totalNominal: item.subtotal,
          });
        }
      });
    });

    return Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredOrders]);

  // Bahan Baku Kritis (Low Stock Alert)
  const lowStockIngredients = useMemo(() => {
    return ingredients.filter((ing) => ing.current_stock <= ing.min_stock_alert);
  }, [ingredients]);

  // Ekspor Rekap Penjualan ke CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Belum ada transaksi untuk diekspor pada rentang ini.');
      return;
    }

    const headers = [
      'No Invoice',
      'Tanggal & Waktu',
      'Tipe Pesanan',
      'Meja / Pelanggan',
      'Subtotal',
      'Pajak PB1',
      'Total Akhir',
      'Metode Bayar',
      'Status Sync',
      'Rincian Menu',
    ];

    const rows = filteredOrders.map((o) => {
      const itemsSummary = o.items
        .map((i) => `${i.quantity}x ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''}`)
        .join('; ');

      return [
        `"${o.invoice_number}"`,
        `"${formatDateIndo(o.created_at)}"`,
        `"${o.order_type === 'dine_in' ? 'Dine-In' : 'Takeaway'}"`,
        `"${o.table_number ? `Meja ${o.table_number}` : o.customer_name || '-'}"`,
        o.subtotal,
        o.tax,
        o.total,
        `"${o.payment_method.toUpperCase()}"`,
        `"${o.sync_status.toUpperCase()}"`,
        `"${itemsSummary}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 bg-slate-50 pb-24 md:pb-8">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Ringkasan & Analitik Bisnis</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitoring performa omset, status pesanan kasir, dan kesiapan bahan baku.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Filter Periode (Grid simetris 4 kolom di layar HP) */}
          <div className="grid grid-cols-4 sm:flex items-center p-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('7days')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition cursor-pointer ${
                dateFilter === '7days'
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('30days')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition cursor-pointer ${
                dateFilter === '30days'
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-center transition cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-orange-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Ekspor Laporan CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Download rekap transaksi ke file CSV Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Cloud & Database Management Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs sm:text-sm">
                Supabase Cloud Database
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Terhubung
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[220px] sm:max-w-none">
              https://bvnykakdzxmivsdfouuc.supabase.co
            </p>
            {supabaseTestStatus && (
              <p className="text-xs font-semibold text-emerald-700 mt-1 animate-fade-in">
                {supabaseTestStatus}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleTestSupabase}
            disabled={isTestingSupabase}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition border border-slate-200 cursor-pointer disabled:opacity-50"
            title="Kirim test query ke Supabase cloud"
          >
            {isTestingSupabase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Tes Koneksi Cloud</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllData}
            disabled={isClearingData}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition border border-rose-200 cursor-pointer disabled:opacity-50"
            title="Kosongkan seluruh menu dan bahan baku demo lokal"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Menu & Bahan Demo</span>
          </button>
        </div>
      </div>

      {/* 1. Baris KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset Penjualan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Omset ({dateFilter === 'today' ? 'Hari Ini' : dateFilter === '7days' ? '7 Hari' : dateFilter === '30days' ? '30 Hari' : 'Semua'})
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 stroke-2" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatRupiah(totalRevenue)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
            <span>Subtotal: {formatRupiah(totalSubtotal)}</span>
            <span>•</span>
            <span>PB1: {formatRupiah(totalTax)}</span>
          </div>
        </div>

        {/* Total Transaksi Selesai */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Transaksi
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 stroke-2" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalTransactions} <span className="text-sm font-semibold text-slate-500">Pesanan</span>
          </p>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
            <span>Dine-In: {orderTypeBreakdown.dineInCount}</span>
            <span>•</span>
            <span>Takeaway: {orderTypeBreakdown.takeawayCount}</span>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rata-rata Belanja (AOV)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 stroke-2" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatRupiah(averageOrderValue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Rata-rata per struk belanja pelanggan
          </p>
        </div>

        {/* Bahan Baku Kritis Alert */}
        <div
          onClick={() => onNavigateTab('inventory')}
          className={`p-5 rounded-2xl border transition shadow-2xs cursor-pointer ${
            lowStockIngredients.length > 0
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Bahan Baku Menipis
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                lowStockIngredients.length > 0
                  ? 'bg-rose-100 text-rose-600 animate-pulse'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5 stroke-2" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {lowStockIngredients.length}{' '}
            <span className="text-sm font-semibold text-slate-500">Item Kritis</span>
          </p>
          <p className="text-[11px] text-orange-600 font-semibold mt-2 flex items-center gap-1 hover:underline">
            <span>Kelola di Inventori</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* 2. Grid Baris Tengah: Alert Stok Menipis & Metode Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2 Kolom): Peringatan Stok Bahan Baku (Low Inventory Widget) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    lowStockIngredients.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Monitoring Bahan Baku Rendah (Low Stock)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('inventory')}
                className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Semua Bahan</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {lowStockIngredients.length === 0 ? (
              <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-700 text-sm">Semua Stok Bahan Baku Aman</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Tidak ada bahan baku yang berada di bawah ambang batas minimum. Operasional dapur berjalan lancar!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {lowStockIngredients.slice(0, 5).map((ing) => {
                  const percentage = Math.min(
                    100,
                    Math.round((ing.current_stock / (ing.min_stock_alert * 2)) * 100)
                  );
                  const isOut = ing.current_stock === 0;

                  return (
                    <div key={ing.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                            {ing.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isOut ? 'Habis (0)' : 'Stok Kritis'}
                          </span>
                        </div>

                        {/* Progress Bar Stok */}
                        <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOut ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.max(5, percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900">
                          {ing.current_stock.toLocaleString('id-ID')} {ing.unit}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Min. batas: {ing.min_stock_alert.toLocaleString('id-ID')} {ing.unit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {lowStockIngredients.length > 5 && (
            <p className="text-xs text-slate-400 pt-3 border-t border-slate-100 mt-2 text-center">
              +{lowStockIngredients.length - 5} bahan baku kritis lainnya di tab Inventori.
            </p>
          )}
        </div>

        {/* Kolom Kanan: Distribusi Pembayaran & Tipe Order */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base pb-3 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-500" />
              <span>Metode Pembayaran</span>
            </h3>

            <div className="space-y-4 mt-4">
              {/* Tunai (Cash) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    Tunai (Cash)
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(paymentBreakdown.amounts.cash)} ({paymentBreakdown.counts.cash})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${
                        totalRevenue > 0
                          ? (paymentBreakdown.amounts.cash / totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* QRIS */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    QRIS
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(paymentBreakdown.amounts.qris)} ({paymentBreakdown.counts.qris})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{
                      width: `${
                        totalRevenue > 0
                          ? (paymentBreakdown.amounts.qris / totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Kartu Debit/Kredit */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    Kartu EDC / Debit
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(paymentBreakdown.amounts.card)} ({paymentBreakdown.counts.card})
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{
                      width: `${
                        totalRevenue > 0
                          ? (paymentBreakdown.amounts.card / totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="pt-4 border-t border-slate-100 mt-4 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pintas Operasional Restoran
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {onOpenPOS && (
                <button
                  type="button"
                  onClick={onOpenPOS}
                  className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold border border-orange-200 transition text-left cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Utensils className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="truncate">Layar Kasir</span>
                </button>
              )}
              {onOpenKitchen && (
                <button
                  type="button"
                  onClick={onOpenKitchen}
                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition text-left cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <ChefHat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Layar Dapur</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grid Baris Bawah: Menu Terlaris & Riwayat Transaksi Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base pb-3 border-b border-slate-100 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-orange-600" />
            <span>Top 5 Menu Terlaris</span>
          </h3>

          {topSellingProducts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Belum ada penjualan menu pada periode ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 mt-2">
              {topSellingProducts.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                        {item.name}
                      </p>
                      {item.variantName && (
                        <span className="text-[10px] text-orange-600 font-medium">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 block">
                      {item.qty} porsi
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatRupiah(item.totalNominal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Riwayat Penjualan Terbaru (Recent Transactions Table) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Transaksi Penjualan Terbaru</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                Menampilkan 8 transaksi terakhir
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada transaksi tersimpan di database lokal.
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-2">Invoice</th>
                      <th className="py-2.5 px-2">Waktu</th>
                      <th className="py-2.5 px-2">Tipe</th>
                      <th className="py-2.5 px-2">Total</th>
                      <th className="py-2.5 px-2">Metode</th>
                      <th className="py-2.5 px-2">Sync</th>
                      <th className="py-2.5 px-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.slice(0, 8).map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                          {order.invoice_number}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="px-2 py-0.5 rounded-md font-medium text-[10px] bg-slate-100 text-slate-700">
                            {order.order_type === 'dine_in'
                              ? `Meja ${order.table_number || '-'}`
                              : 'Takeaway'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(order.total)}
                        </td>
                        <td className="py-2.5 px-2 capitalize text-slate-600">
                          {order.payment_method === 'cash' ? 'Tunai' : order.payment_method.toUpperCase()}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              order.sync_status === 'synced'
                                ? 'bg-emerald-100 text-emerald-700'
                                : order.sync_status === 'failed'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.sync_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(order)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-[10px] transition cursor-pointer"
                            title="Buka struk transaksi"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Struk</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
