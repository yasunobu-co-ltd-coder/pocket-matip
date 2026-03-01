'use client';

import { useState } from 'react';
import { Clock, Mic, Upload, LogOut, ChevronRight } from 'lucide-react';
import UserSelect, { UserData } from '@/components/UserSelect';
import HistoryList from '@/components/HistoryList';
import VoiceRecorder from '@/components/VoiceRecorder';

type Tab = 'home' | 'history';
type Mode = 'idle' | 'voice';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [mode, setMode] = useState<Mode>('idle');

  const handleUserSelect = (user: UserData) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
    setMode('idle');
  };

  const handleSaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setMode('idle');
    setActiveTab('home');
  };

  if (!currentUser) {
    return <UserSelect onSelect={handleUserSelect} />;
  }

  return (
    <div className="min-h-screen pb-24 font-sans text-slate-200">

      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-800 to-violet-950 px-6 pt-10 pb-20 rounded-b-[36px] shadow-[0_8px_40px_rgba(88,28,135,0.3)]">
        {/* Logout Button */}
        <div className="absolute top-4 right-4 z-20">
          <button onClick={handleLogout}
            className="p-2.5 bg-white/8 rounded-xl hover:bg-white/15 transition-all duration-200 backdrop-blur-sm border border-white/5"
            title="ユーザー切替">
            <LogOut className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl border border-white/10">
              📱
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold text-white tracking-tight leading-tight">Pocket Matip</h1>
              <p className="text-violet-200/50 text-xs font-medium mt-0.5">{currentUser.name}</p>
            </div>
          </div>
        </div>

        {/* Decorative */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-400/8 rounded-full blur-3xl" />
        <div className="absolute top-16 -left-16 w-48 h-48 bg-violet-400/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="px-5 -mt-10 relative z-20 space-y-5">

        {/* Tab Navigation */}
        <div className="flex bg-[#0c0815] p-1 rounded-2xl border border-violet-500/10">
          <button
            onClick={() => { setActiveTab('home'); setMode('idle'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'home'
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/20'
              : 'text-slate-500 hover:text-slate-400'}`}
          >
            🏠 ホーム
          </button>
          <button
            onClick={() => { setActiveTab('history'); setMode('idle'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'history'
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/20'
              : 'text-slate-500 hover:text-slate-400'}`}
          >
            📋 履歴一覧
          </button>
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && mode === 'idle' && (
          <div className="space-y-5 animate-fade-in-up">

            {/* Main CTA */}
            <button
              onClick={() => setMode('voice')}
              className="w-full bg-[#0c0815] p-7 rounded-2xl border border-violet-500/10 shadow-[0_4px_30px_rgba(139,92,246,0.06)] hover:border-violet-500/25 hover:shadow-[0_4px_40px_rgba(139,92,246,0.12)] transition-all duration-300 active:scale-[0.98] flex flex-col items-center text-center gap-5 group"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/15 to-purple-500/15 flex items-center justify-center text-violet-400 group-hover:from-violet-500 group-hover:to-purple-600 group-hover:text-white transition-all duration-300 shadow-[0_0_40px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                <Mic className="w-9 h-9" />
              </div>
              <div>
                <div className="text-lg font-bold text-white mb-1.5">議事録を作成</div>
                <div className="text-[13px] text-slate-400/70 leading-relaxed">
                  録音またはファイルアップロード
                </div>
                <div className="text-violet-400/40 text-[11px] flex items-center justify-center gap-1 mt-2">
                  <Upload className="w-3 h-3" />
                  ボイスメモの共有にも対応
                </div>
              </div>
            </button>

            {/* Recent History */}
            <div className="bg-[#0c0815] rounded-2xl p-5 border border-violet-500/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300/80 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-violet-400/50" />
                  最近の記録
                </h3>
                <button onClick={() => setActiveTab('history')}
                  className="text-[11px] text-violet-400/40 font-medium hover:text-violet-400/70 transition-colors flex items-center gap-0.5">
                  すべて見る
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                <HistoryList userId={currentUser.id} refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </div>
        )}

        {/* Voice/Upload Mode */}
        {mode === 'voice' && (
          <div className="animate-fade-in-up">
            <VoiceRecorder
              userId={currentUser.id}
              userName={currentUser.name}
              onSaved={handleSaved}
              onCancel={() => setMode('idle')}
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-[#0c0815] rounded-2xl p-5 border border-violet-500/10 min-h-[500px] animate-fade-in-up">
            <h3 className="text-base font-bold text-white/90 mb-5 flex items-center gap-2">
              📋 全履歴一覧
            </h3>
            <HistoryList userId={currentUser.id} refreshTrigger={refreshTrigger} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="text-center py-6 mt-8">
        <p className="text-[10px] text-violet-500/15 font-mono">Pocket Matip v8.0</p>
      </footer>
    </div>
  );
}
