'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Save, Loader2, Check, Upload, FileAudio, ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { splitAudioIntoChunks, transcribeChunksParallel } from '@/lib/audio-chunker';

interface VoiceRecorderProps {
    userId: string;
    userName: string;
    onSaved: () => void;
    onCancel: () => void;
}

interface MinutesData {
    customer: string;
    project: string;
    summary: string;
    decisions: string[];
    todos: string[];
    nextSchedule: string;
    keywords?: string[];
}

// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface ISpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface ISpeechRecognitionConstructor {
    new(): ISpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition?: ISpeechRecognitionConstructor;
        webkitSpeechRecognition?: ISpeechRecognitionConstructor;
    }
}

type InputMode = 'select' | 'recording' | 'uploading';

export default function VoiceRecorder({ userId, userName, onSaved, onCancel }: VoiceRecorderProps) {
    const VERSION = "v9.0";

    const [inputMode, setInputMode] = useState<InputMode>('select');

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [timer, setTimer] = useState(0);
    const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Web Speech API
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const [liveTranscript, setLiveTranscript] = useState<string>('');
    const finalTranscriptRef = useRef<string>('');

    // Upload State
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const audioFileInputRef = useRef<HTMLInputElement>(null);

    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStep, setProcessStep] = useState<string>('');
    const [result, setResult] = useState<MinutesData | null>(null);

    // 2段階フロー
    const [showTranscript, setShowTranscript] = useState(false);
    const [editableTranscript, setEditableTranscript] = useState<string>('');

    // Form State
    const [customer, setCustomer] = useState('');

    useEffect(() => {
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            if (recognitionRef.current) recognitionRef.current.stop();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    const startTimer = () => {
        timerInterval.current = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const startAudioLevelMonitoring = (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        microphone.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
            const level = Math.min(100, (average / 255) * 200);
            setAudioLevel(level);
            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
    };

    const stopAudioLevelMonitoring = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioLevel(0);
    };

    const startSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('このブラウザは音声認識に対応していません。Chrome/Edgeをお使いください。');
            return false;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscriptRef.current += result[0].transcript + ' ';
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            setLiveTranscript(finalTranscriptRef.current + interimTranscript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
        };

        recognition.onend = () => {
            if (isRecording && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) { console.log('Restart failed:', e); }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return true;
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    };

    // === 録音モード ===
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            if (!startSpeechRecognition()) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            finalTranscriptRef.current = '';
            setLiveTranscript('');
            setIsRecording(true);
            setInputMode('recording');
            startTimer();
            startAudioLevelMonitoring(stream);
        } catch (err) {
            alert('マイクへのアクセスが拒否されました');
            console.error(err);
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        stopTimer();
        stopAudioLevelMonitoring();
        stopSpeechRecognition();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        const transcript = finalTranscriptRef.current.trim() || liveTranscript.trim();
        if (transcript) {
            setEditableTranscript(transcript);
            setShowTranscript(true);
        } else {
            alert('音声が認識できませんでした。もう一度お試しください。');
            setInputMode('select');
        }
    };

    // === アップロードモード ===
    // 小さいファイル（25MB以下）はそのまま送信
    const transcribeSingleFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chunkIndex', '0');

        const resp = await fetch('/api/transcribe-chunk', {
            method: 'POST',
            body: formData,
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errData.error || `文字起こし失敗 (${resp.status})`);
        }

        const data = await resp.json();
        return data.text || '';
    };

    // 大きいファイルは分割して並列処理
    const transcribeWithChunking = async (file: File): Promise<string> => {
        setProcessStep('音声ファイルを解析・分割中...');
        const { chunks, totalDuration } = await splitAudioIntoChunks(file);

        const mins = Math.floor(totalDuration / 60);
        const secs = Math.floor(totalDuration % 60);
        setProcessStep(`${mins}分${secs}秒の音声を${chunks.length}チャンクに分割しました。文字起こし中...`);

        const CONCURRENCY = 10;
        const transcript = await transcribeChunksParallel(
            chunks,
            CONCURRENCY,
            (completed, total) => {
                setProcessStep(`文字起こし中... (${completed}/${total}チャンク完了)`);
            }
        );

        return transcript;
    };

    const handleAudioFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedExtensions = ['.mp3', '.m4a', '.wav', '.webm'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            alert('対応していないファイル形式です。\nmp3, m4a, wav ファイルをお選びください。');
            return;
        }

        // 200MB上限（分割処理するのでWhisperの25MB制限は超えてOK）
        const MAX_FILE_SIZE = 200 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            alert(`ファイルサイズが大きすぎます（${(file.size / 1024 / 1024).toFixed(0)}MB）。\n200MB以下のファイルをお選びください。`);
            return;
        }

        setUploadedFile(file);
        setInputMode('uploading');
        setIsProcessing(true);
        setProcessStep('音声ファイルを文字起こし中...');

        try {
            let transcript: string;

            // 25MB以下ならそのまま、超えたら分割並列処理
            if (file.size <= 24 * 1024 * 1024) {
                transcript = await transcribeSingleFile(file);
            } else {
                transcript = await transcribeWithChunking(file);
            }

            if (transcript.trim()) {
                setEditableTranscript(transcript.trim());
                setShowTranscript(true);
            } else {
                alert('音声を認識できませんでした。ファイルを確認してください。');
                setInputMode('select');
            }
        } catch (e: unknown) {
            console.error('Upload transcription error:', e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            alert('文字起こしエラー: ' + msg);
            setInputMode('select');
        } finally {
            setIsProcessing(false);
        }
    };

    // 議事録生成
    const generateMinutes = async () => {
        if (!editableTranscript.trim()) {
            alert('文字起こしテキストがありません');
            return;
        }
        setIsProcessing(true);
        setProcessStep('議事録を生成中...');

        try {
            const resp = await fetch("/api/generate-minutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transcript: editableTranscript, chunkCount: 1 })
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`議事録生成失敗: ${text.substring(0, 100)}`);
            }

            const data = await resp.json();
            let minutes: MinutesData = data.result;
            if (!minutes || (!minutes.summary && !minutes.customer)) {
                minutes = {
                    customer: '', project: '', summary: editableTranscript,
                    decisions: [], todos: [], nextSchedule: '', keywords: []
                };
            }
            setResult(minutes);
            setCustomer(minutes.customer || '');
            setShowTranscript(false);
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            alert('エラーが発生しました: ' + msg);
        } finally {
            setIsProcessing(false);
        }
    };

    // pocket-matip テーブルに保存
    const saveMinutes = async () => {
        if (!result) return;

        try {
            let formattedMemo = result.summary;
            if (result.decisions && result.decisions.length > 0) {
                formattedMemo += '\n\n【決定事項】\n' + result.decisions.map(d => `・${d}`).join('\n');
            }
            if (result.todos && result.todos.length > 0) {
                formattedMemo += '\n\n【TODO】\n' + result.todos.map(t => `・${t}`).join('\n');
            }
            if (result.nextSchedule) {
                formattedMemo += '\n\n【次回予定】\n' + result.nextSchedule;
            }

            const { error } = await supabase
                .from('pocket-matip')
                .insert({
                    user_id: userId,
                    user_name: userName,
                    client_name: customer || result.customer || '名称なし',
                    transcript: editableTranscript,
                    summary: formattedMemo,
                    decisions: result.decisions || [],
                    todos: result.todos || [],
                    next_schedule: result.nextSchedule || '',
                    keywords: result.keywords || [],
                });

            if (error) {
                console.error("Supabase Save Error:", error);
                throw new Error(`${error.message} (Code: ${error.code})`);
            }

            alert('保存しました');
            onSaved();
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : 'Unknown error';
            alert('保存失敗: ' + msg);
        }
    };

    const resetAll = () => {
        setResult(null);
        setShowTranscript(false);
        setEditableTranscript('');
        setLiveTranscript('');
        finalTranscriptRef.current = '';
        setTimer(0);
        setUploadedFile(null);
        setInputMode('select');
    };

    // === Processing Screen ===
    if (isProcessing) {
        return (
            <div className="bg-[#0c0815]/90 rounded-[20px] p-10 text-center border border-white/[0.06]">
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-5" />
                <p className="text-white font-medium text-[15px] mb-1">{processStep}</p>
                {uploadedFile && (
                    <p className="text-[13px] text-white/35 mt-2">{uploadedFile.name}</p>
                )}
            </div>
        );
    }

    // === Transcript Review Screen ===
    if (showTranscript) {
        return (
            <div className="space-y-5 animate-fade-in-up">
                {/* Back button */}
                <button onClick={resetAll} className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    やり直す
                </button>

                <div className="bg-[#0c0815]/90 rounded-[20px] border border-white/[0.06] overflow-hidden">
                    {/* Status bar */}
                    <div className="px-6 py-4 bg-emerald-500/[0.06] border-b border-white/[0.04] flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-[14px] font-semibold text-emerald-400">文字起こし完了</span>
                    </div>

                    <div className="p-6 space-y-5">
                        <p className="text-[13px] text-white/45">
                            内容を確認・編集してから「議事録にまとめる」をタップしてください
                        </p>
                        <textarea
                            value={editableTranscript}
                            onChange={(e) => setEditableTranscript(e.target.value)}
                            className="w-full h-56 bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-4 text-[14px] text-white leading-relaxed focus:border-violet-500/40 outline-none resize-none placeholder-white/20"
                            placeholder="文字起こし結果..."
                        />
                        <button onClick={generateMinutes}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-4 rounded-[14px] shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.98] transition-all text-[15px]">
                            議事録にまとめる
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === Minutes Result Screen ===
    if (result) {
        return (
            <div className="space-y-5 animate-fade-in-up">
                <button onClick={resetAll} className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    やり直す
                </button>

                <div className="bg-[#0c0815]/90 rounded-[20px] border border-white/[0.06] overflow-hidden">
                    {/* Status bar */}
                    <div className="px-6 py-4 bg-emerald-500/[0.06] border-b border-white/[0.04] flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-[14px] font-semibold text-emerald-400">議事録生成完了</span>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Customer name input */}
                        <div>
                            <label className="block text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-2">顧客名</label>
                            <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-[12px] px-4 py-3 text-[14px] text-white focus:border-violet-500/40 outline-none" />
                        </div>

                        {/* Minutes content */}
                        <div className="space-y-5">
                            <div>
                                <h4 className="text-[12px] font-semibold text-violet-400 uppercase tracking-wider mb-2">要約</h4>
                                <p className="text-[14px] text-white/75 leading-[1.8] whitespace-pre-wrap">{result.summary}</p>
                            </div>
                            {result.decisions && result.decisions.length > 0 && (
                                <div>
                                    <h4 className="text-[12px] font-semibold text-violet-400 uppercase tracking-wider mb-2">決定事項</h4>
                                    <ul className="space-y-1.5">
                                        {result.decisions.map((d, i) => (
                                            <li key={i} className="text-[14px] text-white/75 flex gap-2">
                                                <span className="text-violet-400/60 mt-0.5">•</span>
                                                <span>{d}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.todos && result.todos.length > 0 && (
                                <div>
                                    <h4 className="text-[12px] font-semibold text-violet-400 uppercase tracking-wider mb-2">TODO</h4>
                                    <ul className="space-y-1.5">
                                        {result.todos.map((t, i) => (
                                            <li key={i} className="text-[14px] text-white/75 flex gap-2">
                                                <span className="text-violet-400/60 mt-0.5">•</span>
                                                <span>{t}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.nextSchedule && (
                                <div>
                                    <h4 className="text-[12px] font-semibold text-violet-400 uppercase tracking-wider mb-2">次回予定</h4>
                                    <p className="text-[14px] text-white/75">{result.nextSchedule}</p>
                                </div>
                            )}
                        </div>

                        {/* Save button */}
                        <button onClick={saveMinutes}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-4 rounded-[14px] shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-[15px]">
                            <Save className="w-5 h-5" />
                            保存する
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === Recording Screen ===
    if (inputMode === 'recording') {
        return (
            <div className="space-y-5 animate-fade-in-up">
                <div className="bg-[#0c0815]/90 rounded-[20px] border border-white/[0.06] overflow-hidden">
                    {/* Recording status bar */}
                    <div className="px-6 py-3 bg-red-500/[0.08] border-b border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[13px] font-semibold text-red-400">録音中</span>
                        </div>
                        <span className="text-[11px] text-white/20 font-mono">{VERSION}</span>
                    </div>

                    <div className="p-8 text-center">
                        {/* Timer */}
                        <div className="mb-8">
                            <div className="text-[48px] font-mono font-bold text-white tracking-wider">
                                {formatTime(timer)}
                            </div>
                        </div>

                        {/* Live transcript */}
                        {liveTranscript && (
                            <div className="mb-8 p-4 bg-white/[0.02] rounded-[14px] border border-white/[0.04] max-h-32 overflow-y-auto">
                                <p className="text-[13px] text-white/60 text-left whitespace-pre-wrap leading-relaxed">{liveTranscript}</p>
                            </div>
                        )}

                        {/* Audio level */}
                        <div className="space-y-3 mb-10">
                            <div className="flex items-center justify-center gap-[3px] h-12">
                                {[...Array(20)].map((_, i) => {
                                    const offset = Math.abs(10 - i) / 10;
                                    const baseHeight = 3 + (1 - offset) * audioLevel * 0.4;
                                    return (
                                        <div key={i} className="w-[3px] bg-violet-500 rounded-full transition-all duration-75"
                                            style={{ height: `${Math.max(3, baseHeight)}px`, opacity: 0.2 + (audioLevel / 100) * 0.8 }} />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Stop button */}
                        <button onClick={stopRecording}
                            className="w-[72px] h-[72px] rounded-full bg-gradient-to-r from-red-500 to-rose-600 shadow-xl shadow-red-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-90 transition-all mx-auto">
                            <Square fill="currentColor" className="w-7 h-7" />
                        </button>
                        <p className="text-[12px] text-white/30 mt-5">タップして停止</p>
                    </div>
                </div>
            </div>
        );
    }

    // === Select Mode Screen (Default) ===
    return (
        <div className="space-y-5 animate-fade-in-up">
            {/* Back */}
            <button onClick={onCancel} className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                戻る
            </button>

            {/* Title */}
            <div className="px-1 mb-2">
                <h2 className="text-[18px] font-bold text-white">入力方法を選択</h2>
                <p className="text-[13px] text-white/40 mt-1">音声を録音するか、ファイルをアップロードしてください</p>
            </div>

            {/* Option cards */}
            <div className="space-y-3">
                {/* Record option */}
                <button onClick={startRecording}
                    className="w-full bg-[#0c0815]/90 border border-white/[0.06] rounded-[18px] p-5 flex items-center gap-4 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all active:scale-[0.98] group">
                    <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-[15px] font-semibold text-white">録音する</div>
                        <div className="text-[12px] text-white/40 mt-0.5">リアルタイム文字起こし</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" />
                </button>

                {/* Upload option */}
                <button onClick={() => audioFileInputRef.current?.click()}
                    className="w-full bg-[#0c0815]/90 border border-white/[0.06] rounded-[18px] p-5 flex items-center gap-4 hover:bg-white/[0.03] hover:border-white/[0.08] transition-all active:scale-[0.98] group">
                    <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0 group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-[15px] font-semibold text-white">ファイルから</div>
                        <div className="text-[12px] text-white/40 mt-0.5">ボイスメモ等を共有</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" />
                </button>
            </div>

            <input type="file" ref={audioFileInputRef} accept=".mp3,.m4a,.wav,.webm,audio/*" hidden onChange={handleAudioFileSelect} />

            <p className="text-[12px] text-white/25 text-center flex items-center justify-center gap-1.5 pt-2">
                <FileAudio className="w-3 h-3" />
                対応形式: mp3, m4a, wav (最大200MB)
            </p>
        </div>
    );
}
