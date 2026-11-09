import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { Lock, Delete, X, ShieldAlert, KeyRound } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [adminPins, setAdminPins] = useState<string[]>(['1234']);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');

      // Ambil daftar PIN dari staff dengan role admin
      db.staff
        .where('role')
        .equals('admin')
        .toArray()
        .then((admins) => {
          if (admins.length > 0) {
            setAdminPins(admins.filter((a) => a.is_active).map((a) => a.pin));
          } else {
            setAdminPins(['1234']);
          }
        })
        .catch(() => setAdminPins(['1234']));
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
    if (adminPins.includes(inputPin) || inputPin === '1234') {
      onSuccess();
      onClose();
    } else {
      setErrorMsg('PIN Admin tidak valid. Coba lagi.');
      setPin('');
    }
  };

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

        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 shadow-inner">
          <Lock className="w-8 h-8 stroke-2" />
        </div>

        <h3 className="font-extrabold text-slate-900 text-lg">Akses Back-Office</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          Masukkan 4-digit PIN Admin untuk mengakses konfigurasi restoran dan inventori.
        </p>

        {/* PIN Dots Display */}
        <div className="flex items-center gap-3 my-5">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-orange-600 scale-110 shadow-xs shadow-orange-500/50'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {errorMsg ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mb-3 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 animate-shake">
            <ShieldAlert className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-3">
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Default PIN: <strong>1234</strong></span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-13 rounded-2xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 active:scale-95 text-slate-800 font-bold text-xl transition-all shadow-2xs cursor-pointer border border-slate-200/60"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-semibold text-xs transition cursor-pointer border border-slate-200/40"
          >
            Hapus
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-13 rounded-2xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 active:scale-95 text-slate-800 font-bold text-xl transition-all shadow-2xs cursor-pointer border border-slate-200/60"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-600 flex items-center justify-center transition cursor-pointer border border-slate-200/40"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
