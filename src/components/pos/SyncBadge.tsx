import React from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, Database, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { formatDateIndo } from '../../lib/utils';

interface SyncBadgeProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
  onSync: () => void;
  onOpenHistory?: () => void;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  isOnline,
  isSyncing,
  pendingCount,
  lastSyncedAt,
  lastError,
  onSync,
  onOpenHistory,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Online / Offline Status Badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
        }`}
        title={isOnline ? 'Terhubung ke Jaringan' : 'Mode Offline Aktif (Data tetap tersimpan di lokal)'}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* Backend Mode Badge */}
      <div
        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
          isSupabaseConfigured
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
        title={
          isSupabaseConfigured
            ? 'Supabase Terhubung'
            : 'Supabase belum disetting di .env. Berjalan dalam Local-First Dexie Mode'
        }
      >
        {isSupabaseConfigured ? (
          <>
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Supabase Cloud</span>
          </>
        ) : (
          <>
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>Local Dexie DB</span>
          </>
        )}
      </div>

      {/* Pending Sync Orders Badge */}
      {pendingCount > 0 ? (
        <button
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white font-semibold shadow-xs hover:bg-amber-600 transition"
          title={`${pendingCount} pesanan menunggu sinkronisasi ke cloud`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{pendingCount} Pending Sync</span>
        </button>
      ) : (
        <span className="hidden md:inline-block text-slate-500 text-[11px]">
          {lastSyncedAt ? `Tersinkron: ${formatDateIndo(lastSyncedAt)}` : 'Semua data tersinkron'}
        </span>
      )}

      {/* Last Error Notice */}
      {lastError && (
        <div
          className="inline-flex items-center gap-1 text-rose-600 text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-200 max-w-[150px] truncate"
          title={lastError}
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{lastError}</span>
        </div>
      )}

      {/* Manual Sync Button */}
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        title="Sinkronisasi sekarang"
      >
        <RefreshCw
          className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin text-orange-600' : ''}`}
        />
        <span>{isSyncing ? 'Menyinkronkan...' : 'Sync Now'}</span>
      </button>
    </div>
  );
};
