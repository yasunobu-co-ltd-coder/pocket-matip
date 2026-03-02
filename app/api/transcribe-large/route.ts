import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, readFile, readdir, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分（大容量ファイル対応）

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const CHUNK_DURATION_SEC = 18;
const CONCURRENCY = 10;

export async function POST(req: NextRequest) {
    const sessionId = randomUUID();
    const workDir = join(tmpdir(), `transcribe-${sessionId}`);

    try {
        await mkdir(workDir, { recursive: true });

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log(`[transcribe-large] File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(1)}MB`);

        // ファイルを一時保存
        const inputPath = join(workDir, `input_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(inputPath, buffer);

        // ffmpeg-static のパスを取得
        let ffmpegPath: string;
        try {
            ffmpegPath = require('ffmpeg-static');
        } catch {
            return NextResponse.json(
                { error: 'ffmpeg is not available on the server' },
                { status: 500 }
            );
        }

        // ffmpeg で音声を18秒ごとのWAVチャンクに分割
        const chunkPattern = join(workDir, 'chunk_%04d.wav');
        try {
            execSync(
                `"${ffmpegPath}" -i "${inputPath}" -f segment -segment_time ${CHUNK_DURATION_SEC} -ac 1 -ar 16000 -c:a pcm_s16le "${chunkPattern}"`,
                { timeout: 180000, stdio: 'pipe' }
            );
        } catch (ffmpegError: unknown) {
            const msg = ffmpegError instanceof Error ? ffmpegError.message : 'Unknown ffmpeg error';
            console.error('[transcribe-large] ffmpeg error:', msg);
            return NextResponse.json(
                { error: `音声ファイルの変換に失敗しました: ${msg.substring(0, 200)}` },
                { status: 500 }
            );
        }

        // チャンクファイル一覧を取得
        const files = await readdir(workDir);
        const chunkFiles = files
            .filter(f => f.startsWith('chunk_') && f.endsWith('.wav'))
            .sort();

        if (chunkFiles.length === 0) {
            return NextResponse.json(
                { error: '音声ファイルの分割に失敗しました' },
                { status: 500 }
            );
        }

        console.log(`[transcribe-large] Split into ${chunkFiles.length} chunks`);

        // 各チャンクを並列で文字起こし
        const results: string[] = new Array(chunkFiles.length).fill('');

        for (let i = 0; i < chunkFiles.length; i += CONCURRENCY) {
            const batch = chunkFiles.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(
                batch.map(async (chunkFile, batchIdx) => {
                    const chunkPath = join(workDir, chunkFile);
                    const chunkBuffer = await readFile(chunkPath);
                    const chunkBlob = new File([chunkBuffer], chunkFile, { type: 'audio/wav' });

                    const transcription = await openai.audio.transcriptions.create({
                        file: chunkBlob,
                        model: 'gpt-4o-mini-transcribe',
                        language: 'ja',
                    });

                    return { index: i + batchIdx, text: transcription.text };
                })
            );

            for (const r of batchResults) {
                results[r.index] = r.text;
            }
        }

        const transcript = results.filter(t => t && t.trim()).join(' ');

        console.log(`[transcribe-large] Done. Transcript length: ${transcript.length}`);

        return NextResponse.json({ text: transcript });

    } catch (error: unknown) {
        console.error('[transcribe-large] Error:', error);
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    } finally {
        // 一時ファイルを削除
        await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
}
