'use client';

import React, { useState, useEffect } from 'react';
import { Record, getRecordById, updateRecord } from '@/lib/records';

type RecordDetailModalProps = {
  recordId: string;
  onClose: () => void;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate?: (record: Record) => void;
};

export default function RecordDetailModal({
  recordId,
  onClose,
  onDelete,
  onUpdate,
}: RecordDetailModalProps) {
  const [record, setRecord] = useState<Record | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editCustomer, setEditCustomer] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const loadRecord = async () => {
      setLoading(true);
      const data = await getRecordById(recordId);
      setRecord(data);
      if (data) {
        setEditCustomer(data.customer || '');
        setEditContact(data.contact || '');
        setEditProject(data.project || '');
        // HTMLタグを除去してプレーンテキストに
        const plainContent = data.content.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
        setEditContent(plainContent);
      }
      setLoading(false);
    };
    loadRecord();
  }, [recordId]);

  const handleDelete = async () => {
    if (!confirm('この記録を削除しますか？')) return;

    setDeleting(true);
    const success = await onDelete(recordId);
    setDeleting(false);

    if (success) {
      alert('削除しました');
    } else {
      alert('削除に失敗しました');
    }
  };

  const handleSave = async () => {
    if (!record) return;

    setSaving(true);
    const updatedRecord = await updateRecord(recordId, {
      customer: editCustomer,
      contact: editContact,
      project: editProject,
      content: editContent,
    });
    setSaving(false);

    if (updatedRecord) {
      setRecord(updatedRecord);
      setIsEditing(false);
      if (onUpdate) onUpdate(updatedRecord);
      alert('保存しました');
    } else {
      alert('保存に失敗しました');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">
          {record?.type === 'memo' ? '📝 メモ詳細' : '📋 商談記録詳細'}
          {isEditing && ' - 編集中'}
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>読み込み中...</div>
        ) : !record ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--accent-danger)' }}>
            記録が見つかりません
          </div>
        ) : isEditing ? (
          // Edit mode
          <div className="minutes-section" style={{ padding: 0 }}>
            <div className="form-group">
              <label className="form-label">👤 顧客名</label>
              <input
                type="text"
                className="form-input"
                value={editCustomer}
                onChange={(e) => setEditCustomer(e.target.value)}
              />
            </div>
            {record.type === 'negotiation' && (
              <>
                <div className="form-group">
                  <label className="form-label">👔 担当者</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">📁 案件名</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editProject}
                    onChange={(e) => setEditProject(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">📝 内容</label>
              <textarea
                className="form-input"
                rows={10}
                style={{ resize: 'vertical' }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
          </div>
        ) : record.type === 'memo' ? (
          // Memo display
          <div className="minutes-section" style={{ padding: 0 }}>
            <div className="minutes-item">
              <h4>👤 顧客名</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{record.customer || '（未設定）'}</p>
            </div>
            <div className="minutes-item">
              <h4>📅 作成日時</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{formatDate(record.createdAt)}</p>
            </div>
            <div className="minutes-item">
              <h4>📋 内容</h4>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                {record.content}
              </p>
            </div>
          </div>
        ) : (
          // Negotiation record display
          <div className="minutes-section" style={{ padding: 0 }}>
            <div className="minutes-item">
              <h4>👤 顧客名</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{record.customer || '（未設定）'}</p>
            </div>
            <div className="minutes-item">
              <h4>👔 担当者</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{record.contact || '（未設定）'}</p>
            </div>
            <div className="minutes-item">
              <h4>📁 案件名</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{record.project || '（未設定）'}</p>
            </div>
            <div className="minutes-item">
              <h4>📅 作成日時</h4>
              <p style={{ color: 'var(--text-secondary)' }}>{formatDate(record.createdAt)}</p>
            </div>
            <div className="minutes-item">
              <h4>📝 内容</h4>
              <div
                style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: record.content }}
              />
            </div>
            {record.imageUrls && record.imageUrls.length > 0 && (
              <div className="minutes-item">
                <h4>📷 添付画像</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {record.imageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`添付画像${index + 1}`}
                      style={{
                        maxWidth: '100px',
                        maxHeight: '100px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          {isEditing ? (
            <>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                className="btn btn-success"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中...' : '✅ 保存'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                閉じる
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setIsEditing(true)}
                disabled={loading}
              >
                ✏️ 編集
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDelete}
                disabled={deleting || loading}
              >
                {deleting ? '削除中...' : '🗑️ 削除'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
