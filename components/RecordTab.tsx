'use client';

import React, { useState, useRef, useCallback } from 'react';
import { needsSplitting, splitAudioFile, combineTranscriptions, formatFileSize } from '@/lib/audio-utils';

type RecordTabProps = {
  onSaveRecord: (
    customer: string,
    contact: string,
    project: string,
    content: string,
    imageUrls: string[]
  ) => Promise<boolean>;
  onBackToHome?: () => void;
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

export default function RecordTab({ onSaveRecord, onBackToHome }: RecordTabProps) {
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
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);

  // Image state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle audio file upload
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/x-m4a'];
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.webm', '.ogg', '.mp4'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      alert('対応していない音声形式です。\n対応形式: MP3, M4A, WAV, WebM, OGG');
      return;
    }

    // Check file size (max 1GB)
    if (file.size > 1024 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます。最大1GBまで対応しています。');
      return;
    }

    // Create URL for playback
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setRecordStatus(`ファイル選択: ${file.name}`);
    setTimer('--:--');

    // Process the audio file
    processAudio(file);

    // Reset input
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = '';
    }
  };

  // Transcribe a single audio chunk
  const transcribeChunk = async (blob: Blob, filename: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');
    formData.append('language', 'ja');

    const resp = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || 'Whisper API Error');
    }

    const data = await resp.json();
    return data.text;
  };

  // Process audio with AI
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingText('音声ファイルを確認中...');

    try {
      let transcript: string;

      // Check if file needs splitting (> 25MB)
      if (needsSplitting(audioBlob)) {
        setProcessingText(`大きなファイル (${formatFileSize(audioBlob.size)}) を分割中...`);

        // Split the audio file
        const chunks = await splitAudioFile(audioBlob as File, (progress, message) => {
          setProcessingText(message);
        });

        setProcessingText(`${chunks.length}個のチャンクを文字起こし中...`);

        // Transcribe chunks in parallel batches for speed
        const BATCH_SIZE = 10; // Process 10 chunks at a time
        const transcriptions: string[] = new Array(chunks.length).fill('');
        let completedCount = 0;

        for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
          const batch = chunks.slice(batchStart, batchEnd);

          setProcessingText(`文字起こし中... ${completedCount}/${chunks.length} 完了`);

          // Process batch in parallel
          const batchPromises = batch.map(async (chunk, batchIndex) => {
            const globalIndex = batchStart + batchIndex;
            const result = await transcribeChunk(chunk.blob, `chunk_${globalIndex}.wav`);
            transcriptions[globalIndex] = result;
            completedCount++;
            setProcessingText(`文字起こし中... ${completedCount}/${chunks.length} 完了`);
            return result;
          });

          await Promise.all(batchPromises);
        }

        // Combine transcriptions in order
        transcript = combineTranscriptions(transcriptions);
      } else {
        // Normal processing for small files
        setProcessingText('音声を文字に変換中...');
        transcript = await transcribeChunk(audioBlob, 'recording.webm');
      }

      console.log('Transcript:', transcript);

      // 2. GPT-4o-mini for minutes generation
      setProcessingText('AIが議事録を作成中...');

      // Determine summary detail level based on transcript length
      const transcriptLength = transcript.length;
      let summaryInstruction: string;
      let decisionsInstruction: string;
      let todosInstruction: string;

      if (transcriptLength < 500) {
        // Short meeting (< 500 chars, ~1-2 min)
        summaryInstruction = '商談の要約（1-2文程度の簡潔な要約）';
        decisionsInstruction = '決定事項（1-2項目）';
        todosInstruction = 'タスク（1-2項目）';
      } else if (transcriptLength < 2000) {
        // Medium meeting (500-2000 chars, ~3-10 min)
        summaryInstruction = '商談の要約（3-5文程度）';
        decisionsInstruction = '決定事項（2-4項目）';
        todosInstruction = 'タスク（2-4項目）';
      } else if (transcriptLength < 5000) {
        // Long meeting (2000-5000 chars, ~10-30 min)
        summaryInstruction = '商談の要約（5-8文程度、主要なポイントを網羅）';
        decisionsInstruction = '決定事項（3-6項目、詳細に記載）';
        todosInstruction = 'タスク（3-6項目、担当者や期限があれば含める）';
      } else {
        // Very long meeting (> 5000 chars, 30+ min)
        summaryInstruction = '商談の要約（10文以上の詳細な要約、議論の流れや背景も含める）';
        decisionsInstruction = '決定事項（重要度順に5-10項目、背景や理由も簡潔に記載）';
        todosInstruction = 'タスク（優先度順に5-10項目、担当者・期限・詳細を含める）';
      }

      const systemPrompt = `
あなたはプロの営業アシスタントです。以下の商談の文字起こしテキストから、情報を抽出してJSON形式で出力してください。
文字起こしの長さは${transcriptLength}文字です。この長さに見合った詳細度で要約してください。
JSONのフォーマットは以下に従ってください（必ず有効なJSONのみを返してください）。

{
  "customer": "顧客名（不明な場合は空文字）",
  "contact": "担当者名（不明な場合は空文字）",
  "project": "案件名（推測できる場合）",
  "summary": "${summaryInstruction}",
  "decisions": [${decisionsInstruction}],
  "todos": [${todosInstruction}],
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
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
      const rawResult = JSON.parse(gptData.choices[0].message.content);

      // Normalize GPT response - convert any objects to strings
      const normalizeArray = (arr: unknown[] | undefined): string[] => {
        if (!arr) return [];
        return arr.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const obj = item as Record<string, unknown>;
            if ('text' in obj) return String(obj.text);
            if ('content' in obj) return String(obj.content);
            if ('task' in obj) return String(obj.task);
            if ('item' in obj) return String(obj.item);
            if ('description' in obj) return String(obj.description);
            return Object.values(obj).filter(v => typeof v === 'string').join(' - ') || JSON.stringify(obj);
          }
          return String(item);
        });
      };

      const result: MinutesData = {
        ...rawResult,
        decisions: normalizeArray(rawResult.decisions),
        todos: normalizeArray(rawResult.todos),
        keywords: normalizeArray(rawResult.keywords),
      };

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

  // Helper to convert item to string (handles objects from GPT)
  const itemToString = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      // Handle common GPT response formats
      const obj = item as Record<string, unknown>;
      if ('text' in obj) return String(obj.text);
      if ('content' in obj) return String(obj.content);
      if ('task' in obj) return String(obj.task);
      if ('item' in obj) return String(obj.item);
      if ('description' in obj) return String(obj.description);
      // Fallback: try to create readable string
      return Object.values(obj).filter(v => typeof v === 'string').join(' - ') || JSON.stringify(obj);
    }
    return String(item);
  };

  // Generate minutes HTML
  const generateMinutesHtml = (data: MinutesData): string => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const decisionsHtml =
      data.decisions && data.decisions.length > 0
        ? data.decisions.map((d) => `<li>${itemToString(d)}</li>`).join('')
        : '<li>（特になし）</li>';

    const todosHtml =
      data.todos && data.todos.length > 0
        ? data.todos.map((t) => `<li>${itemToString(t)}</li>`).join('')
        : '<li>（特になし）</li>';

    const keywordsHtml =
      data.keywords && data.keywords.length > 0
        ? data.keywords.map((k) => `<span class="tag">${itemToString(k)}</span>`).join('')
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
      {/* Back to Home Button */}
      {onBackToHome && (
        <button className="btn btn-secondary back-btn" onClick={onBackToHome}>
          ← ホームに戻る
        </button>
      )}

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

          {/* Recording Buttons */}
          <div className="record-buttons">
            <button
              className={`record-btn ${isRecording && !isPaused ? 'recording' : ''}`}
              onClick={toggleRecording}
              disabled={isRecording || isProcessing}
            >
              {isRecording ? (isPaused ? '⏸️' : '🎤') : minutesData ? '✓' : '🎤'}
            </button>

            <div className="record-divider">
              <span>または</span>
            </div>

            <button
              className="audio-upload-btn"
              onClick={() => audioFileInputRef.current?.click()}
              disabled={isRecording || isProcessing}
            >
              📁
              <span>ファイル選択</span>
            </button>
          </div>

          <input
            ref={audioFileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,.webm,.ogg,.mp4,audio/*"
            hidden
            onChange={handleAudioFileUpload}
          />

          <div className="audio-formats-hint">
            対応形式: MP3, M4A, WAV, WebM（最大1GB・大容量ファイルは自動分割）
          </div>

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
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span>📝</span>
              AI生成議事録
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => setIsEditingMinutes(!isEditingMinutes)}
            >
              {isEditingMinutes ? '✓ 完了' : '✏️ 編集'}
            </button>
          </div>

          {isEditingMinutes ? (
            <div className="minutes-edit-section">
              {/* Summary Edit */}
              <div className="form-group">
                <label className="form-label">💡 要約</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={minutesData.summary || ''}
                  onChange={(e) => setMinutesData({ ...minutesData, summary: e.target.value })}
                  placeholder="商談の要約を入力..."
                />
              </div>

              {/* Decisions Edit */}
              <div className="form-group">
                <label className="form-label">✅ 決定事項</label>
                {(minutesData.decisions || []).map((decision, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={decision}
                      onChange={(e) => {
                        const newDecisions = [...(minutesData.decisions || [])];
                        newDecisions[idx] = e.target.value;
                        setMinutesData({ ...minutesData, decisions: newDecisions });
                      }}
                    />
                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px 12px' }}
                      onClick={() => {
                        const newDecisions = (minutesData.decisions || []).filter((_, i) => i !== idx);
                        setMinutesData({ ...minutesData, decisions: newDecisions });
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={() => setMinutesData({ ...minutesData, decisions: [...(minutesData.decisions || []), ''] })}
                >
                  + 追加
                </button>
              </div>

              {/* Todos Edit */}
              <div className="form-group">
                <label className="form-label">📝 宿題・TODO</label>
                {(minutesData.todos || []).map((todo, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={todo}
                      onChange={(e) => {
                        const newTodos = [...(minutesData.todos || [])];
                        newTodos[idx] = e.target.value;
                        setMinutesData({ ...minutesData, todos: newTodos });
                      }}
                    />
                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px 12px' }}
                      onClick={() => {
                        const newTodos = (minutesData.todos || []).filter((_, i) => i !== idx);
                        setMinutesData({ ...minutesData, todos: newTodos });
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  onClick={() => setMinutesData({ ...minutesData, todos: [...(minutesData.todos || []), ''] })}
                >
                  + 追加
                </button>
              </div>

              {/* Keywords Edit */}
              <div className="form-group">
                <label className="form-label">🏷️ キーワード</label>
                <input
                  type="text"
                  className="form-input"
                  value={(minutesData.keywords || []).join(', ')}
                  onChange={(e) => {
                    const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                    setMinutesData({ ...minutesData, keywords });
                  }}
                  placeholder="カンマ区切りで入力（例: 見積, 納期, 仕様変更）"
                />
              </div>

              {/* Next Schedule Edit */}
              <div className="form-group">
                <label className="form-label">📅 次回予定</label>
                <input
                  type="text"
                  className="form-input"
                  value={minutesData.nextSchedule || ''}
                  onChange={(e) => setMinutesData({ ...minutesData, nextSchedule: e.target.value })}
                  placeholder="例: 来週水曜 14時 現場確認"
                />
              </div>
            </div>
          ) : (
            <div
              className="minutes-section"
              dangerouslySetInnerHTML={{ __html: generateMinutesHtml(minutesData) }}
            />
          )}

          <div className="record-controls" style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={saveAndNew}>
              ✅ 保存
            </button>
          </div>
        </div>
      )}
    </>
  );
}
