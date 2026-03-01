'use client';

import { useState } from 'react';
import { Clock, Mic, Upload, LogOut, ChevronRight, Home, List, Plus } from 'lucide-react';
import UserSelect, { UserData } from '@/components/UserSelect';
import HistoryList from '@/components/HistoryList';
import VoiceRecorder from '@/components/VoiceRecorder';

type Tab = 'home' | 'history';
type Mode = 'idle' | 'voice';

export default function Page() {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [mode, setMode] = useState<Mode>('idle');

  const handleUserSelect = (user: UserData) => setCurrentUser(user);

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
    <div className="min-h-screen pb-36 font-sans relative">

      {/* ===== HEADER: 2段構成 ===== */}
      <header className="sticky top-0 z-50 bg-[#05020d]/95 backdrop-blur-2xl border-b border-white/[0.06]">
        {/* 上段: ブランド */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-white tracking-tight leading-none">
                Pocket Matip
              </h1>
              <p className="text-[11px] text-white/30 mt-0.5">AI議事録アシスタント</p>
            </div>
          </div>
        </div>
        {/* 下段: ユーザー情報 + アクション */}
        <div className="px-6 pb-4 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center">
              <span className="text-[11px] font-bold text-violet-400">
                {currentUser.name.charAt(0)}
              </span>
            </div>
            <span className="text-[13px] font-medium text-white/70">
              {currentUser.name}
            </span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            title="ユーザー切替">
            <LogOut className="w-3.5 h-3.5" />
            切替
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="px-5 pt-6 pb-4">

        {/* ===== HOME TAB ===== */}
        {activeTab === 'home' && mode === 'idle' && (
          <div className="space-y-8 animate-fade-in-up">

            {/* Hero CTA: 議事録作成 */}
            <section>
              <button
                onClick={() => setMode('voice')}
                className="w-full relative overflow-hidden bg-gradient-to-br from-violet-600/20 to-purple-700/10 backdrop-blur-xl rounded-[20px] border border-violet-500/15 shadow-[0_8px_40px_-8px_rgba(139,92,246,0.2)] hover:border-violet-500/30 hover:shadow-[0_12px_50px_-8px_rgba(139,92,246,0.3)] transition-all duration-300 active:scale-[0.98] group"
              >
                {/* Glow effect */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all" />

                <div className="relative z-10 px-6 py-8 flex items-center gap-5">
                  {/* Icon */}
                  <div className="w-[68px] h-[68px] rounded-[18px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30 group-hover:shadow-violet-500/50 group-hover:scale-105 transition-all flex-shrink-0">
                    <Plus className="w-7 h-7 text-white" />
                  </div>
                  {/* Text */}
                  <div className="text-left flex-1">
                    <div className="text-[18px] font-bold text-white mb-1">新しい議事録を作成</div>
                    <div className="text-[13px] text-white/50 leading-relaxed">
                      録音 or ファイルアップロード
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </button>
            </section>

            {/* Recent Records Section */}
            <section>
              {/* Section Label */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-[13px] font-bold text-white/40 uppercase tracking-[0.08em] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  最近の記録
                </h2>
                <button onClick={() => setActiveTab('history')}
                  className="text-[12px] text-violet-400/70 hover:text-violet-400 transition-colors flex items-center gap-0.5 font-medium">
                  すべて見る
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Records Card */}
              <div className="bg-[#0c0815]/90 backdrop-blur-xl rounded-[18px] border border-white/[0.05]">
                <div className="max-h-[420px] overflow-y-auto p-4">
                  <HistoryList userId={currentUser.id} refreshTrigger={refreshTrigger} />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===== VOICE/UPLOAD MODE ===== */}
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

        {/* ===== HISTORY TAB ===== */}
        {activeTab === 'history' && mode === 'idle' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Section Label */}
            <div className="px-1">
              <h2 className="text-[13px] font-bold text-white/40 uppercase tracking-[0.08em]">
                全履歴
              </h2>
            </div>
            {/* Records */}
            <div className="bg-[#0c0815]/90 backdrop-blur-xl rounded-[18px] border border-white/[0.05] min-h-[400px]">
              <div className="p-4">
                <HistoryList userId={currentUser.id} refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-50">
        {/* Gradient fade above nav */}
        <div className="h-6 bg-gradient-to-t from-[#05020d] to-transparent" />
        <div className="bg-[#05020d]/98 backdrop-blur-2xl border-t border-white/[0.05]">
          <div className="flex items-end justify-around px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
            {/* Home */}
            <button
              onClick={() => { setActiveTab('home'); setMode('idle'); }}
              className={`flex flex-col items-center gap-1 py-2 px-5 rounded-xl transition-all ${activeTab === 'home' && mode === 'idle' ? 'text-violet-400' : 'text-white/35'}`}
            >
              <Home className="w-[22px] h-[22px]" />
              <span className="text-[11px] font-semibold">ホーム</span>
            </button>

            {/* FAB: 録音 */}
            <button
              onClick={() => setMode('voice')}
              className="relative -top-5 flex flex-col items-center"
            >
              <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_6px_28px_rgba(139,92,246,0.5)] active:scale-90 transition-transform border-[3px] border-[#05020d]">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-white/40 mt-1.5">録音</span>
            </button>

            {/* History */}
            <button
              onClick={() => { setActiveTab('history'); setMode('idle'); }}
              className={`flex flex-col items-center gap-1 py-2 px-5 rounded-xl transition-all ${activeTab === 'history' && mode === 'idle' ? 'text-violet-400' : 'text-white/35'}`}
            >
              <List className="w-[22px] h-[22px]" />
              <span className="text-[11px] font-semibold">履歴</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
