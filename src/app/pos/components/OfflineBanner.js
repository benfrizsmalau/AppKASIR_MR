'use client';
import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { processSyncQueue, getPendingCount } from '@/lib/syncEngine';

export default function OfflineBanner({ isOnline }) {
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [wasOffline, setWasOffline] = useState(false);

    // Hitung pending sync
    useEffect(() => {
        const count = async () => {
            const n = await getPendingCount();
            setPendingCount(n);
        };
        count();
        const interval = setInterval(count, 10000);
        return () => clearInterval(interval);
    }, [isOnline]);

    // Otomatis sync saat kembali online
    useEffect(() => {
        if (isOnline && wasOffline && pendingCount > 0) {
            handleSync();
        }
        if (!isOnline) setWasOffline(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const result = await processSyncQueue();
            setSyncResult(result);
            const n = await getPendingCount();
            setPendingCount(n);
        } catch {
            setSyncResult({ synced: 0, failed: 1 });
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncResult(null), 5000);
        }
    };

    if (isOnline && pendingCount === 0 && !syncResult) return null;

    return (
        <div className={`px-4 py-2 flex items-center justify-between gap-3 text-sm font-bold shrink-0 z-50 transition-all ${
            !isOnline
                ? 'bg-gray-900 text-white'
                : pendingCount > 0
                    ? 'bg-blue-600 text-white'
                    : syncResult?.failed > 0
                        ? 'bg-red-600 text-white'
                        : 'bg-green-600 text-white'
        }`}>
            <div className="flex items-center gap-2">
                {!isOnline
                    ? <><WifiOff className="w-4 h-4 shrink-0" /> <span>Mode Offline — Transaksi disimpan lokal, akan tersinkron saat online</span></>
                    : syncing
                        ? <><RefreshCw className="w-4 h-4 shrink-0 animate-spin" /> <span>Menyinkronkan {pendingCount} transaksi ke server...</span></>
                        : syncResult
                            ? syncResult.failed > 0
                                ? <><AlertCircle className="w-4 h-4 shrink-0" /> <span>{syncResult.synced} berhasil, {syncResult.failed} gagal disinkron</span></>
                                : <><CheckCircle2 className="w-4 h-4 shrink-0" /> <span>{syncResult.synced} transaksi berhasil disinkron ke server</span></>
                            : <><Wifi className="w-4 h-4 shrink-0" /> <span>{pendingCount} transaksi offline belum tersinkron</span></>
                }
            </div>

            {isOnline && pendingCount > 0 && !syncing && (
                <button
                    onClick={handleSync}
                    className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-all shrink-0"
                >
                    Sinkron Sekarang
                </button>
            )}
        </div>
    );
}
