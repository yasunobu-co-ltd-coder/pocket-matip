'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HistoryListProps {
    userId: string;
    refreshTrigger: number;
}

interface MinutesRecord {
    id: number;
    created_at: string;
    client_name: string;
    summary: string;
    user_name: string;
}

export default function HistoryList({ userId, refreshTrigger }: HistoryListProps) {
    const [records, setRecords] = useState<MinutesRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('pocket-matip')
                    .select('id, created_at, client_name, summary, user_name')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(30);

                if (fetchError) throw fetchError;
                setRecords(data || []);
            } catch (e: unknown) {
                console.error('Fetch records error:', e);
                const msg = e instanceof Error ? e.message : 'データ取得エラー';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [userId, refreshTrigger]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'たった今';
        if (diffMins < 60) return `${diffMins}分前`;
        if (diffHours < 24) return `${diffHours}時間前`;
        if (diffDays < 7) return `${diffDays}日前`;
        return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-violet-500/50 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 px-4">
                <p className="text-xs text-red-400/70 bg-red-500/5 rounded-xl py-3 px-4">{error}</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-14 h-14 bg-violet-500/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-violet-500/20" />
                </div>
                <p className="text-slate-500 text-sm">まだ記録がありません</p>
                <p className="text-slate-600 text-xs mt-1">議事録を作成すると、ここに表示されます</p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {records.map((record) => (
                <div key={record.id}
                    className="bg-[#0c0815]/60 rounded-xl p-3.5 border border-violet-500/8 hover:border-violet-500/15 transition-all duration-200">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-violet-400/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold text-white/90 truncate">{record.client_name || '名称なし'}</span>
                                <span className="text-[10px] text-violet-400/30 flex items-center gap-1 flex-shrink-0 ml-2">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {formatDate(record.created_at)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400/70 line-clamp-2 leading-relaxed">{record.summary}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
