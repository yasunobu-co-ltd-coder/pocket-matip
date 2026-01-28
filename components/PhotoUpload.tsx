'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  processImage,
  validateImageFile,
  generateStoragePath,
  formatBytes,
  IMAGE_CONFIG,
} from '@/lib/image-utils';
import {
  uploadPhoto,
  createPhotoRecord,
  PhotoType,
  PHOTO_TYPE_LABELS,
  PhotoInsert,
} from '@/lib/photos';

type PhotoUploadProps = {
  onUploadComplete?: () => void;
  onBackToHome?: () => void;
};

type UploadFile = {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
};

export default function PhotoUpload({ onUploadComplete, onBackToHome }: PhotoUploadProps) {
  const [projectId, setProjectId] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [photoType, setPhotoType] = useState<PhotoType>('before');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];

    Array.from(selectedFiles).forEach((file) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      const id = crypto.randomUUID();
      const preview = URL.createObjectURL(file);

      newFiles.push({
        id,
        file,
        preview,
        status: 'pending',
      });
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const uploadFiles = async () => {
    if (!projectId.trim()) {
      alert('案件IDを入力してください');
      return;
    }

    if (files.length === 0) {
      alert('写真を選択してください');
      return;
    }

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];
      if (uploadFile.status !== 'pending') continue;

      try {
        // Update status to processing
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'processing' as const } : f))
        );

        // Process image (compress, resize, remove EXIF)
        const processed = await processImage(uploadFile.file);

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f))
        );

        // Generate storage path
        const storagePath = generateStoragePath(projectId, workDate, photoType);

        // Upload to storage
        const { path, error } = await uploadPhoto(storagePath, processed.blob, processed.mimeType);

        if (error) {
          throw error;
        }

        // Create database record
        const photoRecord: PhotoInsert = {
          project_id: projectId,
          work_date: workDate,
          photo_type: photoType,
          storage_path: path,
          file_name: uploadFile.file.name,
          mime_type: processed.mimeType,
          size_bytes: processed.compressedSize,
          description: description || undefined,
        };

        const created = await createPhotoRecord(photoRecord);

        if (!created) {
          throw new Error('Failed to create photo record');
        }

        // Update status to success
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'success' as const } : f))
        );
      } catch (e) {
        console.error('Upload error:', e);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error' as const, error: (e as Error).message }
              : f
          )
        );
      }
    }

    setUploading(false);

    // Check if all successful
    const allSuccess = files.every(
      (f) => f.status === 'success' || f.status === 'pending' // pending ones we just uploaded
    );

    if (allSuccess) {
      // Clear form
      setFiles([]);
      setDescription('');
      onUploadComplete?.();
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'uploading':
        return '📤';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  const getStatusText = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return '待機中';
      case 'processing':
        return '処理中...';
      case 'uploading':
        return 'アップロード中...';
      case 'success':
        return '完了';
      case 'error':
        return 'エラー';
    }
  };

  return (
    <>
      {/* Back to Home Button */}
      {onBackToHome && (
        <button className="btn btn-secondary back-btn" onClick={onBackToHome}>
          ← ホームに戻る
        </button>
      )}

      {/* Upload Form Card */}
      <div className="card">
        <div className="card-title">
          <span>📷</span>
          現場写真アップロード
        </div>

        {/* Project ID */}
        <div className="form-group">
          <label className="form-label">案件ID *</label>
          <input
            type="text"
            className="form-input"
            placeholder="例: PROJECT-001"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        </div>

        {/* Work Date */}
        <div className="form-group">
          <label className="form-label">作業日 *</label>
          <input
            type="date"
            className="form-input"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
        </div>

        {/* Photo Type */}
        <div className="form-group">
          <label className="form-label">写真種別 *</label>
          <div className="photo-type-buttons">
            {(Object.entries(PHOTO_TYPE_LABELS) as [PhotoType, string][]).map(([type, label]) => (
              <button
                key={type}
                className={`photo-type-btn ${photoType === type ? 'active' : ''}`}
                onClick={() => setPhotoType(type)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">説明（任意）</label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="写真の説明を入力..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* File Upload Area */}
        <div className="form-group">
          <label className="form-label">写真を選択</label>
          <div
            className="image-upload"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="image-upload-icon">📁</div>
            <div className="image-upload-text">タップして写真を選択</div>
            <div className="image-upload-hint">
              対応形式: JPG, PNG, HEIC / 最大: {IMAGE_CONFIG.maxSizeBytes / 1024 / 1024}MB
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* Selected Files Preview */}
        {files.length > 0 && (
          <div className="upload-files-list">
            <div className="upload-files-header">
              選択した写真 ({files.length}枚)
            </div>
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="upload-file-item">
                <img
                  src={uploadFile.preview}
                  alt={uploadFile.file.name}
                  className="upload-file-thumb"
                />
                <div className="upload-file-info">
                  <div className="upload-file-name">{uploadFile.file.name}</div>
                  <div className="upload-file-size">{formatBytes(uploadFile.file.size)}</div>
                  <div className={`upload-file-status status-${uploadFile.status}`}>
                    {getStatusIcon(uploadFile.status)} {getStatusText(uploadFile.status)}
                    {uploadFile.error && <span className="error-text"> - {uploadFile.error}</span>}
                  </div>
                </div>
                {uploadFile.status === 'pending' && (
                  <button
                    className="upload-file-remove"
                    onClick={() => removeFile(uploadFile.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '16px' }}
          onClick={uploadFiles}
          disabled={uploading || files.length === 0}
        >
          {uploading ? '📤 アップロード中...' : `📤 ${files.length}枚をアップロード`}
        </button>
      </div>

      {/* Info Card */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-title">
          <span>ℹ️</span>
          アップロード情報
        </div>
        <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
          <li>画像は自動的にリサイズ・圧縮されます（最大1280px）</li>
          <li>EXIF位置情報は自動的に削除されます</li>
          <li>アップロード後、写真一覧で確認できます</li>
        </ul>
      </div>
    </>
  );
}
