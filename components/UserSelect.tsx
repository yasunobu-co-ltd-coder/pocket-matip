'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, RefreshCw, ChevronRight, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface UserData {
    id: string;
    name: string;
    [key: string]: unknown;
}

interface UserSelectProps {
    onSelect: (user: UserData) => void;
}

export default function UserSelect({ onSelect }: UserSelectProps) {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('user')
                .select('*')
                .order('id', { ascending: true });
            if (fetchError) throw fetchError;
            setUsers(data || []);
        } catch (e: unknown) {
            console.error('Fetch users error:', e);
            const msg = e instanceof Error ? e.message : 'ユーザー取得エラー';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const gradients = [
        'from-violet-500 to-purple-600',
        'from-purple-500 to-fuchsia-600',
        'from-fuchsia-500 to-pink-600',
        'from-indigo-500 to-violet-600',
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
            </div>

            {/* Brand */}
            <div className="mb-12 text-center animate-fade-in-up relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-[22px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/20">
                    <Mic className="w-9 h-9 text-white" />
                </div>
                <h1 className="text-[26px] font-bold text-white tracking-tight mb-2">Pocket Matip</h1>
                <p className="text-white/40 text-[14px]">AI議事録アシスタント</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-[360px] relative z-10 bg-[#0c0815]/90 backdrop-blur-xl rounded-[20px] border border-white/[0.06] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.12em] mb-5 text-center">ユーザーを選択</p>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                        <p className="text-[12px] text-white/35">読み込み中...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/[0.06] border border-red-500/10 rounded-2xl p-5 text-center">
                        <p className="text-[13px] text-red-300 mb-4">{error}</p>
                        <button onClick={fetchUsers}
                            className="text-[12px] text-white/70 hover:text-white flex items-center gap-1.5 mx-auto bg-white/[0.05] px-4 py-2 rounded-lg transition-all active:scale-95">
                            <RefreshCw className="w-3.5 h-3.5" />
                            再読み込み
                        </button>
                    </div>
                )}

                {!loading && !error && users.length === 0 && (
                    <div className="text-center py-10">
                        <User className="w-8 h-8 text-white/15 mx-auto mb-3" />
                        <p className="text-white/50 text-[13px]">ユーザーが登録されていません</p>
                    </div>
                )}

                {!loading && !error && users.length > 0 && (
                    <div className="space-y-2">
                        {users.map((user, index) => (
                            <button
                                key={user.id}
                                onClick={() => onSelect(user)}
                                className="w-full rounded-[14px] p-4 flex items-center gap-3.5 hover:bg-white/[0.04] transition-all duration-150 active:scale-[0.98] group border border-transparent hover:border-white/[0.05]"
                            >
                                <div className={`w-11 h-11 rounded-[12px] bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center shadow-lg shadow-violet-500/15 group-hover:scale-105 transition-transform`}>
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-[15px] font-semibold text-white">{user.name}</div>
                                    <div className="text-[11px] text-white/30 mt-0.5">タップしてログイン</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-[10px] text-white/15 font-mono mt-12 relative z-10">v9.0</p>
        </div>
    );
}
