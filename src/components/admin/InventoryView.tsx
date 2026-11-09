import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { syncService } from '../../services/syncService';
import type { Ingredient, IngredientUnit, StockAdjustmentLog } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import {
  Boxes,
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  SlidersHorizontal,
  History,
  X,
  Search,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const UNIT_OPTIONS: IngredientUnit[] = ['gram', 'ml', 'pcs', 'kg', 'liter', 'lembar', 'porsi'];

interface InventoryViewProps {
  readOnly?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ readOnly = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'master' | 'logs'>('master');

  // Modals state
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [opnameIngredient, setOpnameIngredient] = useState<Ingredient | null>(null);

  // Queries
  const ingredients = useLiveQuery(() => db.ingredients.toArray(), []) || [];
  const stockLogs =
    useLiveQuery(async () => {
      return await db.stock_logs.orderBy('created_at').reverse().limit(100).toArray();
    }, []) || [];

  // Metrics
  const criticalCount = ingredients.filter((i) => i.current_stock <= i.min_stock_alert).length;
  const totalValuation = ingredients.reduce((sum, i) => sum + i.current_stock * i.cost_per_unit, 0);

  // Filter
  const filteredIngredients = ingredients.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCritical = !filterCriticalOnly || i.current_stock <= i.min_stock_alert;
    return matchesSearch && matchesCritical;
  });

  const handleOpenAdd = () => {
    setEditingIngredient(null);
    setIsIngredientModalOpen(true);
  };

  const handleOpenEdit = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setIsIngredientModalOpen(true);
  };

  const handleDelete = async (ing: Ingredient) => {
    if (confirm(`Hapus bahan baku "${ing.name}"? Ini juga akan menghapus resep yang menggunakan bahan ini.`)) {
      await db.ingredients.delete(ing.id);
      await db.recipes.where('ingredient_id').equals(ing.id).delete();
      syncService.syncIngredients().catch(console.warn);
    }
  };

  const handleOpenOpname = (ing: Ingredient) => {
    setOpnameIngredient(ing);
    setIsOpnameModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Notice for Cashier and Kitchen */}
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-3xl text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mode Tinjau Stok:</strong> Anda dapat melihat sisa stok dan status ketersediaan bahan baku secara real-time. Perubahan master bahan dan penyesuaian stok (Stock Opname) hanya dapat dilakukan oleh <strong>Admin</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Top Banner & Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Bahan */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Total Master Bahan
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {ingredients.length} <span className="text-xs font-semibold text-slate-400">item</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Stok Kritis Alert */}
        <div
          onClick={() => setFilterCriticalOnly((prev) => !prev)}
          className={`p-5 rounded-3xl border shadow-xs flex items-center justify-between transition cursor-pointer ${
            criticalCount > 0
              ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100/70'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wide opacity-80">
              Stok Kritis / Perlu Belanja
            </span>
            <div className="text-2xl font-black mt-1 flex items-center gap-2">
              <span className={criticalCount > 0 ? 'text-rose-600' : 'text-slate-900'}>
                {criticalCount}
              </span>
              {criticalCount > 0 && (
                <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                  Restock Segera
                </span>
              )}
            </div>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              criticalCount > 0 ? 'bg-rose-200/60 text-rose-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Estimasi Valuasi Aset Inventori */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Valuasi Aset Bahan Baku
            </span>
            <div className="text-2xl font-black text-orange-600 mt-1">
              {formatRupiah(totalValuation)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Header & Tabs */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'master'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Master Bahan Baku ({ingredients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Log Mutasi / Opname ({stockLogs.length})</span>
          </button>
        </div>

        {activeTab === 'master' && !readOnly && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-2" />
            <span>Tambah Bahan Baku</span>
          </button>
        )}
      </div>

      {/* Tab 1: Master Bahan Baku */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama bahan baku..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterCriticalOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                filterCriticalOnly
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Hanya Tampilkan Stok Kritis</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Nama Bahan Baku</th>
                    <th className="py-3.5 px-4">Satuan</th>
                    <th className="py-3.5 px-4">Stok Saat Ini</th>
                    <th className="py-3.5 px-4">Min. Alert</th>
                    <th className="py-3.5 px-4">Biaya HPP / Satuan</th>
                    <th className="py-3.5 px-4">Total Aset</th>
                    <th className="py-3.5 px-4 text-right">
                      {readOnly ? 'Ketersediaan' : 'Aksi'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Boxes className="w-10 h-10 mb-2 stroke-1.5 text-slate-300" />
                          <p className="font-bold text-slate-700 text-sm">Belum Ada Master Bahan Baku</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            {readOnly
                              ? 'Daftar stok bahan baku dapur masih kosong.'
                              : 'Inventori bahan baku masih kosong. Klik tombol "+ Tambah Bahan Baku" di atas untuk mendaftarkan bahan baku baru.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada data bahan baku yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isCritical = ing.current_stock <= ing.min_stock_alert;

                      return (
                        <tr
                          key={ing.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCritical ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{ing.name}</span>
                              {isCritical && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Kritis
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 uppercase text-slate-500 font-semibold text-[11px]">
                            {ing.unit}
                          </td>

                          <td className="py-3 px-4 font-black text-sm">
                            <span
                              className={isCritical ? 'text-rose-600' : 'text-slate-800'}
                            >
                              {ing.current_stock.toLocaleString()}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-medium">
                            {ing.min_stock_alert.toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-slate-700 font-semibold">
                            {formatRupiah(ing.cost_per_unit)}
                          </td>

                          <td className="py-3 px-4 font-bold text-orange-600">
                            {formatRupiah(ing.current_stock * ing.cost_per_unit)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {readOnly ? (
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  isCritical
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isCritical ? 'Perlu Restock' : 'Stok Aman'}
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Stock Opname */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenOpname(ing)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition cursor-pointer border border-orange-200"
                                  title="Penyesuaian Stok / Opname Fisik"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Opname</span>
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(ing)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                  title="Edit Bahan"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => handleDelete(ing)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                  title="Hapus Bahan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Log Mutasi / Opname */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h4 className="font-bold text-slate-800 text-sm">
              Riwayat Mutasi Pengurangan Penjualan & Stock Opname
            </h4>
            <span className="text-xs text-slate-400">100 riwayat mutasi terbaru</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Bahan Baku</th>
                  <th className="py-3 px-4">Perubahan Stok</th>
                  <th className="py-3 px-4">Sebelum</th>
                  <th className="py-3 px-4">Sesudah</th>
                  <th className="py-3 px-4">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada catatan mutasi stok. Lakukan transaksi di kasir atau stock opname.
                    </td>
                  </tr>
                ) : (
                  stockLogs.map((log) => {
                    const isDeduction = log.quantity_changed < 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                          {formatDateIndo(log.created_at)}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          {log.ingredient_name}
                        </td>
                        <td className="py-2.5 px-4 font-black">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                              isDeduction
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isDeduction ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <TrendingUp className="w-3 h-3" />
                            )}
                            {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {log.previous_stock.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {log.new_stock.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {log.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Tambah / Edit Bahan */}
      <IngredientFormModal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        ingredientToEdit={editingIngredient}
      />

      {/* Modal 2: Penyesuaian Stok / Stock Opname */}
      <StockOpnameModal
        isOpen={isOpnameModalOpen}
        onClose={() => setIsOpnameModalOpen(false)}
        ingredient={opnameIngredient}
      />
    </div>
  );
};

/* ========================================================
   SUB-MODAL 1: FORM TAMBAH / EDIT BAHAN BAKU
   ======================================================== */
interface IngredientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientToEdit: Ingredient | null;
}

const IngredientFormModal: React.FC<IngredientFormModalProps> = ({
  isOpen,
  onClose,
  ingredientToEdit,
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<IngredientUnit>('gram');
  const [currentStock, setCurrentStock] = useState('');
  const [minAlert, setMinAlert] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (ingredientToEdit) {
      setName(ingredientToEdit.name);
      setUnit(ingredientToEdit.unit);
      setCurrentStock(ingredientToEdit.current_stock.toString());
      setMinAlert(ingredientToEdit.min_stock_alert.toString());
      setCostPerUnit(ingredientToEdit.cost_per_unit.toString());
    } else {
      setName('');
      setUnit('gram');
      setCurrentStock('1000');
      setMinAlert('200');
      setCostPerUnit('20');
    }
  }, [ingredientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Ingredient = {
        id: ingredientToEdit ? ingredientToEdit.id : crypto.randomUUID(),
        name: name.trim(),
        unit,
        current_stock: parseFloat(currentStock) || 0,
        min_stock_alert: parseFloat(minAlert) || 0,
        cost_per_unit: parseFloat(costPerUnit) || 0,
        updated_at: new Date().toISOString(),
      };

      await db.ingredients.put(payload);
      syncService.syncIngredients().catch(console.warn);

      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan bahan baku: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-extrabold text-slate-800 text-base">
            {ingredientToEdit ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Bahan Baku *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beras Ramos / Daging Sapi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Satuan Ukuran *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as IngredientUnit)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stok Saat Ini *
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Minimum Alert Stok *
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={minAlert}
                onChange={(e) => setMinAlert(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Biaya HPP per Satuan (Rp) *
              </label>
              <input
                type="number"
                required
                min={0}
                step={1}
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Bahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ========================================================
   SUB-MODAL 2: PENYESUAIAN STOK / STOCK OPNAME FISIK
   ======================================================== */
interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: Ingredient | null;
}

const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  onClose,
  ingredient,
}) => {
  const [opnameType, setOpnameType] = useState<'in' | 'out' | 'set'>('in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !ingredient) return null;

  const current = ingredient.current_stock;
  const numAmount = parseFloat(amount) || 0;

  let calculatedNewStock = current;
  if (opnameType === 'in') calculatedNewStock = current + numAmount;
  else if (opnameType === 'out') calculatedNewStock = Math.max(0, current - numAmount);
  else if (opnameType === 'set') calculatedNewStock = Math.max(0, numAmount);

  const delta = calculatedNewStock - current;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numAmount) || numAmount < 0) return;

    setIsSubmitting(true);
    try {
      await db.ingredients.update(ingredient.id, {
        current_stock: calculatedNewStock,
        updated_at: new Date().toISOString(),
      });

      // Simpan log mutasi
      await db.stock_logs.add({
        id: crypto.randomUUID(),
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        type: delta >= 0 ? 'in' : 'out',
        quantity_changed: delta,
        previous_stock: current,
        new_stock: calculatedNewStock,
        reason: reason.trim() || (delta >= 0 ? 'Restock / Belanja' : 'Penyesuaian Fisik Opname'),
        created_at: new Date().toISOString(),
      });

      syncService.syncIngredients().catch(console.warn);

      onClose();
    } catch (err: any) {
      alert('Gagal memperbarui stok: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">
              Penyesuaian Stok / Opname
            </h3>
            <p className="text-xs text-slate-500 font-bold">{ingredient.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current Stock Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Stok Sistem Saat Ini:</span>
            <span className="font-black text-sm text-slate-900">
              {current.toLocaleString()} {ingredient.unit}
            </span>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipe Penyesuaian
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOpnameType('in')}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition cursor-pointer border ${
                  opnameType === 'in'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + Tambah (Masuk)
              </button>

              <button
                type="button"
                onClick={() => setOpnameType('out')}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition cursor-pointer border ${
                  opnameType === 'out'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                - Kurangi (Waste)
              </button>

              <button
                type="button"
                onClick={() => setOpnameType('set')}
                className={`py-2 px-1 text-xs font-bold rounded-xl transition cursor-pointer border ${
                  opnameType === 'set'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                = Set Fisik Akhir
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {opnameType === 'set' ? 'Jumlah Stok Fisik Riil' : 'Jumlah Perubahan'} ({ingredient.unit}) *
            </label>
            <input
              type="number"
              required
              min={0}
              step={0.1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alasan Penyesuaian
            </label>
            <input
              type="text"
              placeholder="Contoh: Belanja pasar pagi, barang busuk/expired, selisih opname..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Result Calculation Preview */}
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-orange-900">Stok Akhir Baru:</span>
            <span className="font-black text-base text-orange-700">
              {calculatedNewStock.toLocaleString()} {ingredient.unit}
            </span>
          </div>

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
              disabled={isSubmitting || !amount}
              className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Perbarui Stok Fisik'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
