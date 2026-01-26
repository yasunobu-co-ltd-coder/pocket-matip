'use client';

import React, { useState } from 'react';

type QuickMemoModalProps = {
  onClose: () => void;
  onSave: (customer: string, content: string) => Promise<boolean>;
};

export default function QuickMemoModal({ onClose, onSave }: QuickMemoModalProps) {
  const [customer, setCustomer] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      alert('メモ内容を入力してください');
      return;
    }

    setSaving(true);
    const success = await onSave(customer, content);
    setSaving(false);

    if (success) {
      alert('メモを保存しました');
    } else {
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">📝 クイックメモ</h3>
        <div className="form-group">
          <label className="form-label">顧客名（任意）</label>
          <input
            type="text"
            className="form-input"
            placeholder="例: ○○株式会社"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">メモ内容</label>
          <textarea
            className="form-input"
            placeholder="メモ内容を入力..."
            rows={5}
            style={{ resize: 'vertical' }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={saving}
          >
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
