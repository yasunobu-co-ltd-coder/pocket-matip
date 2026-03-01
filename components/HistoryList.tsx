'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText, User } from 'lucide-react';
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
            <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-violet-500/40 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-[12px] text-red-400/60 bg-red-500/[0.05] rounded-xl py-3 px-4 border border-red-500/10">{error}</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="text-center py-14">
                <div className="w-14 h-14 bg-violet-500/[0.05] rounded-[16px] flex items-center justify-center mx-auto mb-3 border border-violet-500/[0.06]">
                    <FileText className="w-6 h-6 text-violet-500/15" />
                </div>
                <p className="text-white/30 text-[13px] font-medium">まだ記録がありません</p>
                <p className="text-violet-300/15 text-[11px] mt-1">議事録を作成すると表示されます</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {records.map((record) => (
                <div key={record.id}
                    className="bg-white/[0.02] backdrop-blur-sm rounded-[14px] p-4 border border-violet-500/[0.06] hover:border-violet-500/12 hover:bg-violet-500/[0.03] transition-all duration-200">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0 border border-violet-500/[0.06]">
                            <FileText className="w-4 h-4 text-violet-400/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[14px] font-bold text-white/85 truncate">{record.client_name || '名称なし'}</span>
                                <span className="text-[10px] text-violet-400/25 flex-shrink-0 bg-violet-500/[0.05] px-2 py-0.5 rounded-md">
                                    {formatDate(record.created_at)}
                                </span>
                            </div>
                            <p className="text-[12px] text-slate-400/50 line-clamp-2 leading-[1.6]">{record.summary}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
