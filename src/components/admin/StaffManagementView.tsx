import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { syncService } from '../../services/syncService';
import type { StaffUser, StaffRole } from '../../types';
import {
  Users,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ChefHat,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  X,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const StaffManagementView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  const staffList = useLiveQuery(() => db.staff.toArray(), []) || [];

  const toggleShowPin = (id: string) => {
    setShowPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleDelete = async (staff: StaffUser) => {
    if (staffList.filter((s) => s.role === 'admin').length <= 1 && staff.role === 'admin') {
      alert('Tidak dapat menghapus admin terakhir. Minimal harus ada 1 akun Admin aktif!');
      return;
    }
    if (confirm(`Yakin ingin menghapus staf "${staff.name}"?`)) {
      await db.staff.delete(staff.id);
      syncService.syncStaff().catch(console.warn);
    }
  };

  const handleToggleActive = async (staff: StaffUser) => {
    await db.staff.update(staff.id, {
      is_active: !staff.is_active,
    });
    syncService.syncStaff().catch(console.warn);
  };

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Admin / Owner</span>
          </span>
        );
      case 'cashier':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
            <span>Kasir</span>
          </span>
        );
      case 'kitchen':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
            <span>Dapur / Kitchen</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span>Manajemen Staf & Akses PIN</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar karyawan kasir, tim dapur, dan administrator dengan 4-digit PIN akses cepat.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-2" />
          <span>Tambah Staf Baru</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Nama Lengkap Staf</th>
                <th className="py-3.5 px-4">Peran / Role</th>
                <th className="py-3.5 px-4">4-Digit PIN Akses</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Belum ada data staf.
                  </td>
                </tr>
              ) : (
                staffList.map((s) => {
                  const isVisible = showPins[s.id] || false;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {s.name}
                      </td>

                      <td className="py-3.5 px-4">{getRoleBadge(s.role)}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
                          <span>{isVisible ? s.pin : '••••'}</span>
                          <button
                            type="button"
                            onClick={() => toggleShowPin(s.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                            title={isVisible ? 'Sembunyikan PIN' : 'Lihat PIN'}
                          >
                            {isVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(s)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            s.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.is_active ? 'bg-emerald-600' : 'bg-slate-400'
                            }`}
                          />
                          <span>{s.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            title="Edit Staf"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            title="Hapus Staf"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Staf */}
      <StaffFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffToEdit={editingStaff}
      />
    </div>
  );
};

/* ========================================================
   SUB-MODAL: FORM TAMBAH / EDIT STAF
   ======================================================== */
interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit: StaffUser | null;
}

const StaffFormModal: React.FC<StaffFormModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (staffToEdit) {
      setName(staffToEdit.name);
      setRole(staffToEdit.role);
      setPin(staffToEdit.pin);
      setIsActive(staffToEdit.is_active);
    } else {
      setName('');
      setRole('cashier');
      setPin('');
      setIsActive(true);
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pin.length !== 4) {
      alert('PIN harus terdiri dari 4 digit angka!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: StaffUser = {
        id: staffToEdit ? staffToEdit.id : crypto.randomUUID(),
        name: name.trim(),
        role,
        pin,
        is_active: isActive,
        created_at: staffToEdit?.created_at || new Date().toISOString(),
      };

      await db.staff.put(payload);
      syncService.syncStaff().catch(console.warn);

      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan data staf: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-extrabold text-slate-800 text-base">
            {staffToEdit ? 'Edit Data Staf' : 'Tambah Staf Baru'}
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
              Nama Lengkap Staf *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Peran / Jabatan *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
            >
              <option value="cashier">Kasir (Akses POS & Buat Pesanan)</option>
              <option value="kitchen">Dapur / Kitchen (Melihat & Menyiapkan Pesanan)</option>
              <option value="admin">Administrator / Owner (Akses Penuh Back-Office)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>4-Digit PIN Akses Cepat *</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              required
              placeholder="Contoh: 1234"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 4) setPin(val);
              }}
              className="w-full px-3 py-2 text-base font-mono font-bold tracking-widest text-center bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              PIN digunakan untuk otorisasi cepat login kasir dan akses Back-Office.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isStaffActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
            />
            <label htmlFor="isStaffActiveCheck" className="text-xs font-bold text-slate-700">
              Akun Staf Aktif
            </label>
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
              disabled={isSubmitting || pin.length !== 4}
              className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Staf'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
