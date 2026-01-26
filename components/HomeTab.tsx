'use client';

import React from 'react';
import { Record } from '@/lib/records';
import { Task } from '@/app/page';

type TabId = 'home' | 'record' | 'tasks' | 'search';

type HomeTabProps = {
  stats: {
    todayMeetings: number;
    pendingTasks: number;
    weekRecords: number;
  };
  records: Record[];
  tasks: Task[];
  loading: boolean;
  onSwitchTab: (tabId: TabId) => void;
  onOpenQuickMemo: () => void;
  onOpenPhotoCapture: () => void;
  onViewRecord: (id: string) => void;
  onToggleTask: (id: string) => void;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function HomeTab({
  stats,
  records,
  tasks,
  loading,
  onSwitchTab,
  onOpenQuickMemo,
  onOpenPhotoCapture,
  onViewRecord,
  onToggleTask,
}: HomeTabProps) {
  const recentRecords = records.slice(0, 5);
  const todayTasks = tasks.filter((t) => !t.completed).slice(0, 5);

  return (
    <>
      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.todayMeetings}</div>
          <div className="stat-label">本日の商談</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pendingTasks}</div>
          <div className="stat-label">未完了タスク</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.weekRecords}</div>
          <div className="stat-label">今週の記録</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="quick-action" onClick={() => onSwitchTab('record')}>
          <div className="quick-action-icon">🎤</div>
          <div className="quick-action-title">音声録音</div>
          <div className="quick-action-desc">商談・メモを記録</div>
        </div>
        <div className="quick-action" onClick={onOpenQuickMemo}>
          <div className="quick-action-icon">📝</div>
          <div className="quick-action-title">クイックメモ</div>
          <div className="quick-action-desc">テキストで素早く入力</div>
        </div>
        <div className="quick-action" onClick={onOpenPhotoCapture}>
          <div className="quick-action-icon">📷</div>
          <div className="quick-action-title">写真撮影</div>
          <div className="quick-action-desc">現場写真を追加</div>
        </div>
        <div className="quick-action" onClick={() => onSwitchTab('search')}>
          <div className="quick-action-icon">🔎</div>
          <div className="quick-action-title">履歴検索</div>
          <div className="quick-action-desc">過去の商談を検索</div>
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
                  <span className="history-customer">{record.customer || '名称なし'}</span>
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

      {/* Today's Tasks */}
      <div className="card">
        <div className="card-title">
          <span>⚡</span>
          今日のタスク
          <span className="badge">{todayTasks.length}</span>
        </div>
        <ul className="task-list">
          {todayTasks.length === 0 ? (
            <li style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              タスクはありません
            </li>
          ) : (
            todayTasks.map((task) => (
              <li key={task.id} className="task-item">
                <div
                  className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                  onClick={() => onToggleTask(task.id)}
                />
                <div className="task-content">
                  <div
                    className="task-title"
                    style={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </div>
                  <div className="task-meta">
                    <span>📅 {task.dueDate || '未設定'}</span>
                    <span className={`task-priority priority-${task.priority}`}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
