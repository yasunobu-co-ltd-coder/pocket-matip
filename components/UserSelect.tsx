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

    useEffect(() => {
        fetchUsers();
    }, []);

    // ユーザーごとのグラデーション色
    const gradients = [
        'from-violet-500 to-purple-600',
        'from-purple-500 to-fuchsia-600',
        'from-fuchsia-500 to-pink-600',
        'from-indigo-500 to-violet-600',
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
            {/* Background glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Logo */}
            <div className="mb-12 text-center animate-fade-in-up relative z-10">
                <div className="w-24 h-24 bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-md rounded-[28px] flex items-center justify-center text-5xl mx-auto mb-5 border border-violet-500/15 shadow-[0_0_60px_rgba(139,92,246,0.12)]">
                    📱
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">Pocket Matip</h1>
                <p className="text-violet-300/40 text-sm">音声から議事録を自動生成</p>
            </div>

            {/* User Selection */}
            <div className="w-full max-w-sm relative z-10">
                <p className="text-xs font-semibold text-violet-300/30 uppercase tracking-widest mb-4 text-center">Select User</p>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                        <p className="text-xs text-violet-300/30">読み込み中...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/5 border border-red-500/15 rounded-2xl p-5 text-center">
                        <p className="text-sm text-red-400/80 mb-4">{error}</p>
                        <button onClick={fetchUsers}
                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 mx-auto bg-violet-500/10 px-4 py-2 rounded-xl transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                            再読み込み
                        </button>
                    </div>
                )}

                {!loading && !error && users.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-3">👤</div>
                        <p className="text-slate-500 text-sm">ユーザーが登録されていません</p>
                    </div>
                )}

                {!loading && !error && users.length > 0 && (
                    <div className="space-y-3">
                        {users.map((user, index) => (
                            <button
                                key={user.id}
                                onClick={() => onSelect(user)}
                                className="w-full bg-[#0c0815]/80 border border-violet-500/10 rounded-2xl p-4 flex items-center gap-4 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 active:scale-[0.97] group"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="text-[15px] font-bold text-white group-hover:text-violet-100 transition-colors">{user.name}</div>
                                    <div className="text-[11px] text-violet-300/25 mt-0.5">タップしてログイン</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-violet-500/20 group-hover:text-violet-400/50 group-hover:translate-x-0.5 transition-all" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <p className="text-[10px] text-violet-500/15 font-mono mt-16 relative z-10">v8.0</p>
        </div>
    );
}
