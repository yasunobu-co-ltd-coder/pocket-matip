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
                <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <p className="text-[12px] text-red-300 bg-red-500/[0.08] rounded-xl py-3 px-4 border border-red-500/15">{error}</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 bg-violet-500/[0.05] rounded-[16px] flex items-center justify-center mx-auto mb-4 border border-violet-500/[0.06]">
                    <FileText className="w-6 h-6 text-violet-400/40" />
                </div>
                <p className="text-white/70 text-[13px] font-medium">まだ記録がありません</p>
                <p className="text-white/40 text-[11px] mt-2">議事録を作成すると表示されます</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {records.map((record) => (
                <div key={record.id}
                    className="bg-white/[0.02] backdrop-blur-sm rounded-[16px] p-5 border border-violet-500/[0.06] hover:border-violet-500/12 hover:bg-violet-500/[0.03] transition-all duration-200">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center flex-shrink-0 border border-violet-500/[0.06]">
                            <FileText className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[15px] font-bold text-white truncate">{record.client_name || '名称なし'}</span>
                                <span className="text-[11px] text-white/50 flex-shrink-0 bg-violet-500/[0.08] px-2.5 py-1 rounded-md">
                                    {formatDate(record.created_at)}
                                </span>
                            </div>
                            <p className="text-[13px] text-white/60 line-clamp-2 leading-[1.6]">{record.summary}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
