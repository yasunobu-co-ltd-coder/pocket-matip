'use client';

import React, { useState, useRef, useCallback } from 'react';

type RecordTabProps = {
  onSaveRecord: (
    customer: string,
    contact: string,
    project: string,
    content: string,
    imageUrls: string[]
  ) => Promise<boolean>;
};

type MinutesData = {
  customer?: string;
  contact?: string;
  project?: string;
  summary?: string;
  decisions?: string[];
  todos?: string[];
  keywords?: string[];
  nextSchedule?: string;
};

export default function RecordTab({ onSaveRecord }: RecordTabProps) {
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [projectName, setProjectName] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordStatus, setRecordStatus] = useState('タップして録音開始');
  const [timer, setTimer] = useState('00:00');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');
  const [minutesData, setMinutesData] = useState<MinutesData | null>(null);

  // Image state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer update
  const updateTimer = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    setTimer(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        processAudio(blob);
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      setRecordStatus('録音中...');

      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } catch (err) {
      alert('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pausedTimeRef.current = Date.now() - startTimeRef.current;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setRecordStatus('一時停止中');
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      setRecordStatus('録音中...');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setIsRecording(false);
      setIsPaused(false);
      setRecordStatus('録音完了');
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    }
  };

  // Process audio with AI
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingText('音声を文字に変換中...');

    try {
      // 1. Whisper API transcription
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ja');

      const whisperResp = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!whisperResp.ok) throw new Error('Whisper API Error');
      const whisperData = await whisperResp.json();
      const transcript = whisperData.text;

      console.log('Transcript:', transcript);

      // 2. GPT-4o-mini for minutes generation
      setProcessingText('AIが議事録を作成中...');

      const systemPrompt = `
あなたはプロの営業アシスタントです。以下の商談の文字起こしテキストから、情報を抽出してJSON形式で出力してください。
JSONのフォーマットは以下に従ってください（必ず有効なJSONのみを返してください）。

{
  "customer": "顧客名（不明な場合は空文字）",
  "contact": "担当者名（不明な場合は空文字）",
  "project": "案件名（推測できる場合）",
  "summary": "商談の要約（3行程度）",
  "decisions": ["決定事項1", "決定事項2"],
  "todos": ["タスク1", "タスク2"],
  "keywords": ["キーワード1", "キーワード2"],
  "nextSchedule": "次回予定（日時など）"
}
`;

      const gptResp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!gptResp.ok) throw new Error('GPT API Error');
      const gptData = await gptResp.json();
      const result: MinutesData = JSON.parse(gptData.choices[0].message.content);

      // Auto-fill form
      if (result.customer) setCustomerName(result.customer);
      if (result.contact) setContactPerson(result.contact);
      if (result.project) setProjectName(result.project);

      setMinutesData(result);
    } catch (error) {
      console.error(error);
      alert('AI処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setUploadedImages((prev) => [...prev, result]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Generate minutes HTML
  const generateMinutesHtml = (data: MinutesData): string => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const decisionsHtml =
      data.decisions && data.decisions.length > 0
        ? data.decisions.map((d) => `<li>${d}</li>`).join('')
        : '<li>（特になし）</li>';

    const todosHtml =
      data.todos && data.todos.length > 0
        ? data.todos.map((t) => `<li>${t}</li>`).join('')
        : '<li>（特になし）</li>';

    const keywordsHtml =
      data.keywords && data.keywords.length > 0
        ? data.keywords.map((k) => `<span class="tag">${k}</span>`).join('')
        : '';

    const nextScheduleHtml = data.nextSchedule
      ? `<li>${data.nextSchedule}</li>`
      : '<li>（未定）</li>';

    return `
      <div class="minutes-item">
        <h4>📋 商談情報</h4>
        <ul>
          <li>顧客: ${data.customer || '（未入力）'}</li>
          <li>担当者: ${data.contact || '（未入力）'}</li>
          <li>案件: ${data.project || '（未入力）'}</li>
          <li>日時: ${dateStr}</li>
        </ul>
      </div>
      <div class="minutes-item">
        <h4>💡 要約</h4>
        <p style="font-size:14px; color:var(--text-secondary); line-height:1.6;">${data.summary || ''}</p>
      </div>
      <div class="minutes-item">
        <h4>✅ 決定事項</h4>
        <ul>${decisionsHtml}</ul>
      </div>
      <div class="minutes-item">
        <h4>📝 宿題・TODO</h4>
        <ul>${todosHtml}</ul>
      </div>
      <div class="minutes-item">
        <h4>🏷️ キーワード</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">${keywordsHtml}</div>
      </div>
      <div class="minutes-item">
        <h4>📅 次回予定</h4>
        <ul>${nextScheduleHtml}</ul>
      </div>
    `;
  };

  // Save and reset
  const saveAndNew = async () => {
    if (!minutesData) return;

    const content = generateMinutesHtml(minutesData);
    const success = await onSaveRecord(
      customerName,
      contactPerson,
      projectName,
      content,
      uploadedImages
    );

    if (success) {
      alert('商談記録を保存しました！');
      // Reset
      setMinutesData(null);
      setAudioUrl(null);
      setTimer('00:00');
      setRecordStatus('タップして録音開始');
      setCustomerName('');
      setContactPerson('');
      setProjectName('');
      setUploadedImages([]);
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
    } else {
      alert('保存に失敗しました');
    }
  };

  return (
    <>
      {/* Business Info Card */}
      <div className="card">
        <div className="card-title">
          <span>📋</span>
          商談情報
        </div>
        <div className="form-group">
          <label className="form-label">顧客名</label>
          <input
            type="text"
            className="form-input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="例: ○○株式会社"
          />
        </div>
        <div className="form-group">
          <label className="form-label">担当者名</label>
          <input
            type="text"
            className="form-input"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="例: 田中部長"
          />
        </div>
        <div className="form-group">
          <label className="form-label">案件名（任意）</label>
          <input
            type="text"
            className="form-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="例: ポンプ交換工事"
          />
        </div>
      </div>

      {/* Recording Card */}
      <div className="card">
        <div className="card-title">
          <span>🎙️</span>
          音声録音
        </div>
        <div className="record-section">
          <div className="record-status">{recordStatus}</div>

          <button
            className={`record-btn ${isRecording && !isPaused ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={isRecording}
          >
            {isRecording ? (isPaused ? '⏸️' : '🎤') : minutesData ? '✓' : '🎤'}
          </button>

          {isRecording && !isPaused && (
            <div className="waveform">
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
              <div className="wave-bar"></div>
            </div>
          )}

          <div className="record-timer">{timer}</div>

          {isRecording && (
            <div className="record-controls">
              {!isPaused ? (
                <button className="btn btn-secondary" onClick={pauseRecording}>
                  ⏸️ 一時停止
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={resumeRecording}>
                  ▶️ 再開
                </button>
              )}
              <button className="btn btn-danger" onClick={stopRecording}>
                ⏹️ 停止
              </button>
            </div>
          )}

          {audioUrl && (
            <audio controls src={audioUrl} style={{ marginTop: '16px', width: '100%' }} />
          )}
        </div>
      </div>

      {/* Image Upload Card */}
      <div className="card">
        <div className="card-title">
          <span>📷</span>
          写真を添付
        </div>
        <div
          className="image-upload"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="image-upload-icon">📸</div>
          <div className="image-upload-text">タップして写真を追加</div>
        </div>
        <input
          type="file"
          id="imageInput"
          ref={fileInputRef}
          accept="image/*"
          multiple
          hidden
          onChange={handleImageUpload}
        />
        {uploadedImages.length > 0 && (
          <div className="image-preview">
            {uploadedImages.map((src, index) => (
              <div key={index} className="preview-item">
                <img src={src} alt={`添付画像${index + 1}`} />
                <span className="preview-remove" onClick={() => removeImage(index)}>
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Card */}
      {isProcessing && (
        <div className="card">
          <div className="spinner"></div>
          <p className="processing-text">{processingText}</p>
          <p className="processing-text" style={{ marginTop: '8px', fontSize: '12px' }}>
            約1〜2分お待ちください
          </p>
        </div>
      )}

      {/* Minutes Card */}
      {minutesData && !isProcessing && (
        <div className="card">
          <div className="card-title">
            <span>📝</span>
            AI生成議事録
          </div>
          <div
            className="minutes-section"
            dangerouslySetInnerHTML={{ __html: generateMinutesHtml(minutesData) }}
          />
          <div className="record-controls" style={{ marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={() => alert('編集機能は開発中です')}>
              ✏️ 編集
            </button>
            <button className="btn btn-success" onClick={() => alert('共有機能は開発中です')}>
              📤 共有
            </button>
            <button className="btn btn-primary" onClick={saveAndNew}>
              ✅ 保存
            </button>
          </div>
        </div>
      )}
    </>
  );
}
