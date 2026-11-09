import React, { useState, useEffect } from 'react';
import { db, INITIAL_STAFF } from '../../lib/db';
import type { StaffUser } from '../../types';
import { Lock, Delete, X, KeyRound, ShieldAlert, Users, ChefHat, ShoppingBag } from 'lucide-react';

interface StaffPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (staff: StaffUser) => void;
  targetRole?: 'admin' | 'cashier' | 'kitchen' | 'any';
  title?: string;
  subtitle?: string;
}

export const StaffPinModal: React.FC<StaffPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetRole = 'any',
  title,
  subtitle,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [allStaff, setAllStaff] = useState<StaffUser[]>(INITIAL_STAFF);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');

      // Load all staff from Dexie
      db.staff
        .toArray()
        .then((staffList) => {
          if (staffList.length > 0) {
            setAllStaff(staffList);
          } else {
            setAllStaff(INITIAL_STAFF);
          }
        })
        .catch(() => setAllStaff(INITIAL_STAFF));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = (inputPin: string) => {
    // 1. Cari staff di database lokal yang memiliki PIN ini
    let matched = allStaff.find((s) => s.pin === inputPin && s.is_active);

    // Fallback jika database belum tersinkronisasi
    if (!matched) {
      matched = INITIAL_STAFF.find((s) => s.pin === inputPin);
    }

    if (!matched) {
      setErrorMsg('PIN tidak valid. Silakan coba lagi.');
      setPin('');
      return;
    }

    // 2. Jika ada persyaratan role khusus (misal butuh akses admin saja)
    if (targetRole !== 'any' && matched.role !== targetRole) {
      const roleName =
        matched.role === 'cashier' ? 'Kasir' : matched.role === 'kitchen' ? 'Dapur' : 'Admin';
      setErrorMsg(`PIN terdaftar sebagai ${roleName}. Akses ini memerlukan PIN Administrator.`);
      setPin('');
      return;
    }

    // Berhasil autentikasi
    onSuccess(matched);
    onClose();
  };

  const modalTitle =
    title ||
    (targetRole === 'admin'
      ? 'Akses Back-Office Admin'
      : targetRole === 'kitchen'
      ? 'Akses Layar Dapur'
      : 'Otorisasi PIN Karyawan');

  const modalSubtitle =
    subtitle ||
    (targetRole === 'admin'
      ? 'Masukkan 4-digit PIN Admin untuk mengakses pengaturan dan inventori.'
      : 'Masukkan 4-digit PIN staf untuk berganti akses atau peran.');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden flex flex-col items-center p-6 text-center">
        {/* Header & Close */}
        <div className="w-full flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Icon */}
        <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 shadow-inner">
          <KeyRound className="w-7 h-7 stroke-2" />
        </div>

        <h3 className="font-extrabold text-slate-900 text-lg">{modalTitle}</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{modalSubtitle}</p>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 my-5">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-orange-600 scale-110 shadow-sm shadow-orange-500/50'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-1.5 animate-shake">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad Numeric Matrix */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-lg transition flex items-center justify-center shadow-2xs cursor-pointer select-none"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-slate-500 font-semibold text-xs transition flex items-center justify-center cursor-pointer select-none"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-lg transition flex items-center justify-center shadow-2xs cursor-pointer select-none"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold transition flex items-center justify-center cursor-pointer select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Petunjuk Default PIN Bawaan */}
        <div className="mt-5 pt-3 border-t border-slate-100 w-full text-slate-500 space-y-1">
          <p className="text-[11px] font-bold text-slate-700">Daftar PIN Karyawan Bawaan:</p>
          <div className="flex items-center justify-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              <Lock className="w-3 h-3" /> Admin: <strong>1234</strong>
            </span>
            <span className="flex items-center gap-1 font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              <ShoppingBag className="w-3 h-3" /> Kasir: <strong>1111</strong>
            </span>
            <span className="flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              <ChefHat className="w-3 h-3" /> Dapur: <strong>2222</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
