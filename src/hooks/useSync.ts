import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import type { SyncStats } from '../types';

export function useSync() {
  const [stats, setStats] = useState<SyncStats>({
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    lastError: null,
  });

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newStats) => {
      setStats(newStats);
    });

    // Jalankan sync awal saat mount
    syncService.syncAll();

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...stats,
    syncNow: () => syncService.syncAll(),
    syncSingleOrder: (orderId: string) => syncService.syncSingleOrder(orderId),
  };
}
