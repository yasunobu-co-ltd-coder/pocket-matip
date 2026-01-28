/**
 * Audio utility functions for splitting large files
 */

// Whisper API limit
const WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB

// Target chunk size (slightly less than limit for safety)
const CHUNK_TARGET_SIZE = 20 * 1024 * 1024; // 20MB

export type AudioChunk = {
  blob: Blob;
  index: number;
  startTime: number;
  duration: number;
};

/**
 * Check if audio file needs splitting
 */
export function needsSplitting(file: Blob): boolean {
  return file.size > WHISPER_MAX_SIZE;
}

/**
 * Split audio file into chunks using Web Audio API
 */
export async function splitAudioFile(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<AudioChunk[]> {
  onProgress?.(0, '音声ファイルを解析中...');

  // Create audio context
  const audioContext = new AudioContext();

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(10, '音声をデコード中...');

  // Decode audio data
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Failed to decode audio:', error);
    throw new Error('音声ファイルのデコードに失敗しました。対応形式: MP3, M4A, WAV, WebM');
  }

  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  // Calculate chunk duration based on file size and audio duration
  // Estimate: file size / duration = bytes per second
  const bytesPerSecond = file.size / duration;
  const chunkDuration = Math.floor(CHUNK_TARGET_SIZE / bytesPerSecond);

  // Minimum chunk duration: 30 seconds, Maximum: 10 minutes
  const minChunkDuration = 30;
  const maxChunkDuration = 600;
  const finalChunkDuration = Math.max(minChunkDuration, Math.min(maxChunkDuration, chunkDuration));

  const numberOfChunks = Math.ceil(duration / finalChunkDuration);

  onProgress?.(20, `${numberOfChunks}個のチャンクに分割中...`);

  const chunks: AudioChunk[] = [];

  for (let i = 0; i < numberOfChunks; i++) {
    const startTime = i * finalChunkDuration;
    const endTime = Math.min((i + 1) * finalChunkDuration, duration);
    const chunkDurationActual = endTime - startTime;

    const progress = 20 + ((i + 1) / numberOfChunks) * 60;
    onProgress?.(progress, `チャンク ${i + 1}/${numberOfChunks} を処理中...`);

    // Extract chunk from audio buffer
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const chunkLength = endSample - startSample;

    // Create new audio buffer for chunk
    const chunkBuffer = audioContext.createBuffer(
      numberOfChannels,
      chunkLength,
      sampleRate
    );

    // Copy channel data
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const destData = chunkBuffer.getChannelData(channel);
      for (let j = 0; j < chunkLength; j++) {
        destData[j] = sourceData[startSample + j];
      }
    }

    // Encode chunk to WAV blob
    const wavBlob = audioBufferToWav(chunkBuffer);

    chunks.push({
      blob: wavBlob,
      index: i,
      startTime,
      duration: chunkDurationActual,
    });
  }

  onProgress?.(80, '分割完了');

  // Close audio context
  await audioContext.close();

  return chunks;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave channels and write audio data
  const offset = 44;
  const channelData: Float32Array[] = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Combine transcriptions from multiple chunks
 */
export function combineTranscriptions(transcriptions: string[]): string {
  return transcriptions.join(' ').trim();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
