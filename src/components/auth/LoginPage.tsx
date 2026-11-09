import React, { useState, useEffect } from 'react';
import { db, INITIAL_STAFF } from '../../lib/db';
import type { StaffUser, RestaurantSettings } from '../../types';
import {
  Lock,
  Delete,
  KeyRound,
  ShieldAlert,
  Utensils,
  User,
} from 'lucide-react';

interface LoginPageProps {
  settings: RestaurantSettings | null;
  onLoginSuccess: (staff: StaffUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ settings, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [allStaff, setAllStaff] = useState<StaffUser[]>(INITIAL_STAFF);

  // Load all staff from Dexie on mount
  useEffect(() => {
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
  }, []);

  // Listen for physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

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

    // Fallback jika belum tersinkronisasi
    if (!matched) {
      matched = INITIAL_STAFF.find((s) => s.pin === inputPin);
    }

    if (!matched) {
      setErrorMsg('PIN salah atau akun tidak aktif. Silakan coba lagi.');
      setPin('');
      return;
    }

    // Login Berhasil
    onLoginSuccess(matched);
  };

  const restoName = settings?.name || 'Gastro Resto';
  const restoTagline = settings?.tagline || 'Sistem Kasir Offline-First Restoran';

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-linear-to-b from-slate-50 via-slate-100 to-slate-200 font-sans text-slate-900 select-none">
      {/* Brand & Logo Header */}
      <div className="flex flex-col items-center text-center mb-6 animate-fade-in">
        {settings?.logo_url ? (
          <img
            src={settings.logo_url}
            alt={restoName}
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-3 rounded-none border-0 shadow-none bg-transparent"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 mb-3">
            <Utensils className="w-8 h-8 stroke-2" />
          </div>
        )}
        <h1 className="font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
          {restoName}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{restoTagline}</p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl border border-slate-200/90 p-6 sm:p-7 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-2">
          <KeyRound className="w-6 h-6 stroke-2" />
        </div>

        <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl">
          Masuk dengan PIN Staf
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Masukkan 4-digit PIN Anda untuk langsung dialihkan ke peran yang sesuai.
        </p>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3.5 my-5">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-orange-600 scale-125 shadow-md shadow-orange-500/50'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad Matrix */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[270px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-bold text-xl transition flex items-center justify-center shadow-2xs cursor-pointer select-none"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-slate-500 font-semibold text-xs transition flex items-center justify-center cursor-pointer select-none"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-bold text-xl transition flex items-center justify-center shadow-2xs cursor-pointer select-none"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold transition flex items-center justify-center cursor-pointer select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-6 text-center">
        Sistem Kasir Offline-First • Berjalan Mandiri (Standalone)
      </p>
    </div>
  );
};
