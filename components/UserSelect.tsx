'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, RefreshCw, ChevronRight } from 'lucide-react';
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
        <div className="min-h-screen flex flex-col items-center justify-center px-7 py-14 relative">
            {/* Background ambient light */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/[0.07] rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[120px]" />
            </div>

            {/* Logo */}
            <div className="mb-16 text-center animate-fade-in-up relative z-10">
                <div className="w-[96px] h-[96px] bg-gradient-to-br from-violet-500/20 to-purple-600/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center text-[48px] mx-auto mb-7 border border-violet-400/10 shadow-[0_8px_40px_rgba(139,92,246,0.12)]">
                    📱
                </div>
                <h1 className="text-[30px] font-extrabold text-white tracking-tight mb-2">Pocket Matip</h1>
                <p className="text-white/50 text-[14px] font-medium">音声から議事録を自動生成</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-sm relative z-10 bg-[#0c0815]/80 backdrop-blur-xl rounded-[24px] border border-violet-500/10 p-8 shadow-[0_20px_60px_-15px_rgba(88,28,135,0.2)]">
                <p className="text-[12px] font-bold text-white/50 uppercase tracking-[0.15em] mb-6 text-center">ユーザーを選択</p>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                        <p className="text-[11px] text-white/50">読み込み中...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/[0.06] border border-red-500/10 rounded-2xl p-5 text-center">
                        <p className="text-[13px] text-red-300 mb-4">{error}</p>
                        <button onClick={fetchUsers}
                            className="text-[12px] text-white hover:text-violet-300 flex items-center gap-1.5 mx-auto bg-violet-500/10 px-4 py-2 rounded-xl transition-all active:scale-95">
                            <RefreshCw className="w-3.5 h-3.5" />
                            再読み込み
                        </button>
                    </div>
                )}

                {!loading && !error && users.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-14 h-14 bg-violet-500/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <User className="w-6 h-6 text-violet-400/40" />
                        </div>
                        <p className="text-white/60 text-[13px]">ユーザーが登録されていません</p>
                    </div>
                )}

                {!loading && !error && users.length > 0 && (
                    <div className="space-y-3">
                        {users.map((user, index) => (
                            <button
                                key={user.id}
                                onClick={() => onSelect(user)}
                                className="w-full bg-white/[0.03] backdrop-blur-sm border border-violet-500/[0.06] rounded-[18px] p-5 flex items-center gap-4 hover:bg-violet-500/[0.06] hover:border-violet-500/15 transition-all duration-200 active:scale-[0.98] group"
                            >
                                <div className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center shadow-lg shadow-violet-500/15 group-hover:scale-105 transition-transform duration-200`}>
                                    <User className="w-5.5 h-5.5 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-[16px] font-bold text-white">{user.name}</div>
                                    <div className="text-[12px] text-white/50 mt-1">タップしてログイン</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-[10px] text-white/20 font-mono mt-14 relative z-10">v8.0</p>
        </div>
    );
}
