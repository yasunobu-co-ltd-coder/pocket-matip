'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
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
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 px-2">
                <p className="text-[13px] text-red-300 bg-red-500/[0.08] rounded-xl py-3 px-4 border border-red-500/10 text-center">{error}</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-14 h-14 bg-white/[0.03] rounded-[14px] flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
                    <FileText className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/50 text-[14px] font-medium">まだ記録がありません</p>
                <p className="text-white/25 text-[12px] mt-2">議事録を作成すると表示されます</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {records.map((record) => (
                <div key={record.id}
                    className="rounded-[14px] px-4 py-4 hover:bg-white/[0.03] transition-colors duration-150 border border-transparent hover:border-white/[0.04]">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-[10px] bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-[18px] h-[18px] text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                <span className="text-[15px] font-semibold text-white truncate">{record.client_name || '名称なし'}</span>
                                <span className="text-[11px] text-white/35 flex-shrink-0 font-medium">
                                    {formatDate(record.created_at)}
                                </span>
                            </div>
                            <p className="text-[13px] text-white/45 line-clamp-2 leading-[1.7]">{record.summary}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
