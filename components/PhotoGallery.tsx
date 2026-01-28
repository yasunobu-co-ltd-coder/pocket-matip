'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Photo,
  PhotoType,
  PHOTO_TYPE_LABELS,
  getPhotos,
  getSignedUrl,
  getSignedUrls,
  deletePhoto,
  generatePhotosCSV,
  downloadCSV,
} from '@/lib/photos';
import { formatBytes } from '@/lib/image-utils';

type PhotoGalleryProps = {
  onBackToHome?: () => void;
};

type PhotoWithUrl = Photo & {
  signedUrl?: string;
};

export default function PhotoGallery({ onBackToHome }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUrl | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  // Filter states
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterPhotoType, setFilterPhotoType] = useState<PhotoType | ''>('');

  // CSV export state
  const [exporting, setExporting] = useState(false);

  // Load photos with signed URLs
  const loadPhotos = useCallback(async () => {
    setLoading(true);

    const filters: Parameters<typeof getPhotos>[0] = {};

    if (filterProjectId) filters.project_id = filterProjectId;
    if (filterDateFrom) filters.work_date_from = filterDateFrom;
    if (filterDateTo) filters.work_date_to = filterDateTo;
    if (filterPhotoType) filters.photo_type = filterPhotoType as PhotoType;

    const fetchedPhotos = await getPhotos(filters);

    // Get signed URLs for thumbnails
    if (fetchedPhotos.length > 0) {
      const paths = fetchedPhotos.map((p) => p.storage_path);
      const urlMap = await getSignedUrls(paths, 3600); // 1 hour

      const photosWithUrls: PhotoWithUrl[] = fetchedPhotos.map((p) => ({
        ...p,
        signedUrl: urlMap.get(p.storage_path),
      }));

      setPhotos(photosWithUrls);
    } else {
      setPhotos([]);
    }

    setLoading(false);
  }, [filterProjectId, filterDateFrom, filterDateTo, filterPhotoType]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Open photo modal
  const openPhotoModal = async (photo: PhotoWithUrl) => {
    setSelectedPhoto(photo);

    // Get fresh signed URL for full size image
    const url = await getSignedUrl(photo.storage_path, 3600);
    setModalImageUrl(url);
  };

  // Close photo modal
  const closePhotoModal = () => {
    setSelectedPhoto(null);
    setModalImageUrl(null);
  };

  // Delete photo
  const handleDeletePhoto = async (photo: PhotoWithUrl) => {
    if (!confirm('この写真を削除しますか？')) return;

    const success = await deletePhoto(photo.id);
    if (success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      closePhotoModal();
    } else {
      alert('削除に失敗しました');
    }
  };

  // Export CSV
  const handleExportCSV = async (includeUrls: boolean = false) => {
    setExporting(true);

    try {
      const csvContent = await generatePhotosCSV(photos, includeUrls);
      const filename = `photos_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
    } catch (e) {
      console.error('CSV export error:', e);
      alert('CSV出力に失敗しました');
    }

    setExporting(false);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Clear filters
  const clearFilters = () => {
    setFilterProjectId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterPhotoType('');
  };

  return (
    <>
      {/* Back to Home Button */}
      {onBackToHome && (
        <button className="btn btn-secondary back-btn" onClick={onBackToHome}>
          ← ホームに戻る
        </button>
      )}

      {/* Filter Card */}
      <div className="card">
        <div className="card-title">
          <span>🔍</span>
          フィルター
        </div>

        <div className="filter-grid">
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">案件ID</label>
            <input
              type="text"
              className="form-input"
              placeholder="PROJECT-001"
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">期間（開始）</label>
            <input
              type="date"
              className="form-input"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">期間（終了）</label>
            <input
              type="date"
              className="form-input"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label className="form-label">写真種別</label>
            <select
              className="form-input"
              value={filterPhotoType}
              onChange={(e) => setFilterPhotoType(e.target.value as PhotoType | '')}
            >
              <option value="">すべて</option>
              {(Object.entries(PHOTO_TYPE_LABELS) as [PhotoType, string][]).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={loadPhotos} style={{ flex: 1 }}>
            🔍 検索
          </button>
          <button className="btn btn-secondary" onClick={clearFilters}>
            クリア
          </button>
        </div>
      </div>

      {/* Results Card */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-title">
          <span>📷</span>
          写真一覧
          {photos.length > 0 && (
            <span className="badge" style={{ background: 'var(--accent-primary)' }}>
              {photos.length}
            </span>
          )}
        </div>

        {/* Export Buttons */}
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 12px' }}
              onClick={() => handleExportCSV(false)}
              disabled={exporting}
            >
              📄 CSV出力
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 12px' }}
              onClick={() => handleExportCSV(true)}
              disabled={exporting}
            >
              📄 CSV出力（URL付き）
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div className="spinner"></div>
            <div style={{ marginTop: '16px' }}>読み込み中...</div>
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            写真がありません
          </div>
        ) : (
          /* Photo Grid */
          <div className="photo-grid">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="photo-grid-item"
                onClick={() => openPhotoModal(photo)}
              >
                {photo.signedUrl ? (
                  <img src={photo.signedUrl} alt={photo.file_name} className="photo-thumb" />
                ) : (
                  <div className="photo-thumb-placeholder">📷</div>
                )}
                <div className="photo-grid-overlay">
                  <span className="photo-type-badge">{PHOTO_TYPE_LABELS[photo.photo_type]}</span>
                  <span className="photo-date">{formatDate(photo.work_date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={closePhotoModal}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <button className="photo-modal-close" onClick={closePhotoModal}>
              ✕
            </button>

            {/* Photo Display */}
            <div className="photo-modal-image-container">
              {modalImageUrl ? (
                <img
                  src={modalImageUrl}
                  alt={selectedPhoto.file_name}
                  className="photo-modal-image"
                />
              ) : (
                <div className="spinner"></div>
              )}
            </div>

            {/* Photo Details */}
            <div className="photo-modal-details">
              <div className="photo-detail-row">
                <span className="photo-detail-label">案件ID:</span>
                <span>{selectedPhoto.project_id}</span>
              </div>
              <div className="photo-detail-row">
                <span className="photo-detail-label">作業日:</span>
                <span>{formatDate(selectedPhoto.work_date)}</span>
              </div>
              <div className="photo-detail-row">
                <span className="photo-detail-label">種別:</span>
                <span className="tag">{PHOTO_TYPE_LABELS[selectedPhoto.photo_type]}</span>
              </div>
              <div className="photo-detail-row">
                <span className="photo-detail-label">ファイル名:</span>
                <span>{selectedPhoto.file_name}</span>
              </div>
              <div className="photo-detail-row">
                <span className="photo-detail-label">サイズ:</span>
                <span>{formatBytes(selectedPhoto.size_bytes)}</span>
              </div>
              <div className="photo-detail-row">
                <span className="photo-detail-label">アップロード日時:</span>
                <span>{formatDateTime(selectedPhoto.created_at)}</span>
              </div>
              {selectedPhoto.description && (
                <div className="photo-detail-row">
                  <span className="photo-detail-label">説明:</span>
                  <span>{selectedPhoto.description}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="photo-modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => handleDeletePhoto(selectedPhoto)}
              >
                🗑️ 削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
