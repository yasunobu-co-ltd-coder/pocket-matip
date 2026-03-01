'use client';

import { useState } from 'react';
import { Clock, Mic, Upload, LogOut, ChevronRight, Home, List } from 'lucide-react';
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
    <div className="min-h-screen pb-28 font-sans text-slate-200 relative">

      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-[#05020d]/90 backdrop-blur-xl border-b border-violet-500/[0.06]">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-[26px]">📱</span>
            <span className="text-[20px] font-extrabold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent tracking-tight">Pocket Matip</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-violet-300/40 bg-violet-500/[0.08] px-4 py-2 rounded-full border border-violet-500/[0.08]">
              {currentUser.name}
            </span>
            <button onClick={handleLogout}
              className="p-2.5 rounded-xl hover:bg-violet-500/10 transition-all active:scale-95"
              title="ユーザー切替">
              <LogOut className="w-5 h-5 text-violet-400/40" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-5 pt-6 pb-4 space-y-5">

        {/* Home Tab */}
        {activeTab === 'home' && mode === 'idle' && (
          <div className="space-y-5 animate-fade-in-up">

            {/* Main CTA Card */}
            <button
              onClick={() => setMode('voice')}
              className="w-full bg-[#0c0815]/80 backdrop-blur-xl p-8 rounded-[22px] border border-violet-500/10 shadow-[0_10px_40px_-10px_rgba(88,28,135,0.15)] hover:border-violet-500/20 hover:shadow-[0_10px_50px_-10px_rgba(88,28,135,0.25)] transition-all duration-300 active:scale-[0.98] flex flex-col items-center text-center gap-6 group"
            >
              <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-violet-500/15 to-purple-600/15 flex items-center justify-center text-violet-400 group-hover:from-violet-500 group-hover:to-purple-600 group-hover:text-white transition-all duration-300 shadow-[0_0_40px_rgba(139,92,246,0.12)] group-hover:shadow-[0_0_60px_rgba(139,92,246,0.3)] border border-violet-500/10 group-hover:border-violet-400/30">
                <Mic className="w-10 h-10" />
              </div>
              <div>
                <div className="text-[19px] font-bold text-white/90 mb-1.5">議事録を作成</div>
                <div className="text-[14px] text-white/30 leading-relaxed">
                  録音またはファイルアップロード
                </div>
                <div className="text-violet-400/25 text-[12px] flex items-center justify-center gap-1.5 mt-3">
                  <Upload className="w-3.5 h-3.5" />
                  ボイスメモの共有にも対応
                </div>
              </div>
            </button>

            {/* Recent Records Card */}
            <div className="bg-[#0c0815]/80 backdrop-blur-xl rounded-[22px] border border-violet-500/10 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2)]">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-[15px] font-bold text-white/50 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-violet-400/40" />
                  最近の記録
                </h3>
                <button onClick={() => setActiveTab('history')}
                  className="text-[13px] text-violet-400/40 hover:text-violet-400/60 transition-colors flex items-center gap-1 font-medium px-3 py-1.5 rounded-lg hover:bg-violet-500/10">
                  すべて見る
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto px-4 pb-4">
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
        {activeTab === 'history' && mode === 'idle' && (
          <div className="animate-fade-in-up">
            <div className="bg-[#0c0815]/80 backdrop-blur-xl rounded-[22px] border border-violet-500/10 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.2)] min-h-[500px]">
              <div className="px-5 pt-6 pb-4">
                <h3 className="text-[17px] font-bold text-white/80">📋 全履歴一覧</h3>
              </div>
              <div className="px-4 pb-5">
                <HistoryList userId={currentUser.id} refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-50 bg-[#05020d]/95 backdrop-blur-xl border-t border-violet-500/[0.06]">
        <div className="flex justify-around items-center py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            onClick={() => { setActiveTab('home'); setMode('idle'); }}
            className={`flex flex-col items-center gap-1.5 w-24 py-1 transition-all ${activeTab === 'home' ? 'text-violet-400' : 'text-white/25'}`}
          >
            <Home className="w-6 h-6" />
            <span className={`text-[13px] ${activeTab === 'home' ? 'font-bold' : 'font-medium'}`}>ホーム</span>
          </button>
          <button
            onClick={() => setMode('voice')}
            className="flex flex-col items-center gap-1 w-24"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-[0_4px_24px_rgba(139,92,246,0.4)] -mt-5 border-4 border-[#05020d] active:scale-95 transition-transform">
              <Mic className="w-6 h-6 text-white" />
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('history'); setMode('idle'); }}
            className={`flex flex-col items-center gap-1.5 w-24 py-1 transition-all ${activeTab === 'history' ? 'text-violet-400' : 'text-white/25'}`}
          >
            <List className="w-6 h-6" />
            <span className={`text-[13px] ${activeTab === 'history' ? 'font-bold' : 'font-medium'}`}>履歴</span>
          </button>
        </div>
      </div>

      {/* Footer version (above bottom nav) */}
      <div className="text-center pb-20 pt-2">
        <p className="text-[9px] text-violet-500/10 font-mono">v8.0</p>
      </div>
    </div>
  );
}
