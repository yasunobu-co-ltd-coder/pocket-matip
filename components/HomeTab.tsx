'use client';

import React from 'react';
import { Record } from '@/lib/records';

type TabId = 'home' | 'record' | 'search' | 'photo' | 'gallery';

type HomeTabProps = {
  records: Record[];
  loading: boolean;
  onSwitchTab: (tabId: TabId) => void;
  onViewRecord: (id: string) => void;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function HomeTab({
  records,
  loading,
  onSwitchTab,
  onViewRecord,
}: HomeTabProps) {
  const recentRecords = records.slice(0, 5);

  return (
    <>
      {/* Main Action Cards - Vertical Layout */}
      <div className="action-cards">
        <div className="action-card" onClick={() => onSwitchTab('record')}>
          <div className="action-card-icon">🎤</div>
          <div className="action-card-content">
            <div className="action-card-title">音声議事録</div>
            <div className="action-card-desc">音声を録音してAIが自動で議事録を作成</div>
          </div>
          <div className="action-card-arrow">→</div>
        </div>

        <div className="action-card" onClick={() => onSwitchTab('photo')}>
          <div className="action-card-icon">📷</div>
          <div className="action-card-content">
            <div className="action-card-title">現場写真撮影</div>
            <div className="action-card-desc">現場写真をアップロード・管理</div>
          </div>
          <div className="action-card-arrow">→</div>
        </div>

        <div className="action-card" onClick={() => onSwitchTab('gallery')}>
          <div className="action-card-icon">🖼️</div>
          <div className="action-card-content">
            <div className="action-card-title">写真一覧</div>
            <div className="action-card-desc">アップロードした写真の閲覧・CSV出力</div>
          </div>
          <div className="action-card-arrow">→</div>
        </div>

        <div className="action-card" onClick={() => onSwitchTab('search')}>
          <div className="action-card-icon">🔍</div>
          <div className="action-card-content">
            <div className="action-card-title">履歴検索</div>
            <div className="action-card-desc">過去の商談記録を検索</div>
          </div>
          <div className="action-card-arrow">→</div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="card">
        <div className="card-title">
          <span>📋</span>
          最近の記録
        </div>
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              読み込み中...
            </div>
          ) : recentRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              記録はまだありません
            </div>
          ) : (
            recentRecords.map((record) => (
              <div
                key={record.id}
                className="history-item"
                onClick={() => onViewRecord(record.id)}
              >
                <div className="history-header">
                  <span className="history-customer">{record.project || record.customer || '名称なし'}</span>
                  <span className="history-date">{formatDate(record.createdAt)}</span>
                </div>
                <div className="history-summary">
                  {record.type === 'memo'
                    ? record.content
                    : record.content.replace(/<[^>]*>/g, '').substring(0, 60) + '...'}
                </div>
                <div className="history-tags">
                  <span className="tag">{record.type === 'memo' ? 'メモ' : '商談'}</span>
                  {record.project && <span className="tag">{record.project}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
