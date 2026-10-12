import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
} from "mediabunny";
import type { Plan } from "@/features/plan/buildPlan";
import { outputToSource, segmentOutDur } from "@/features/plan/buildPlan";
import type { FrameSource } from "@/features/media/frameSource";
import { createVideoElement, exactSeek } from "@/features/media/frameSource";
import { drawPlanFrame } from "@/features/render/drawFrame";

export const EXPORT_FPS = 30;

export interface ExportResult {
  blob: Blob;
  filename: string;
  note?: string;
}

export interface ExportOptions {
  source: FrameSource;
  plan: Plan;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}

export function exportDims(source: FrameSource): { width: number; height: number } {
  const scale = Math.min(1, 1280 / source.width, 720 / source.height);
  const even = (v: number) => Math.max(2, Math.round((v * scale) / 2) * 2);
  return { width: even(source.width), height: even(source.height) };
}

/** True when the browser can encode H.264 at the export size. */
export async function canExportMp4(source: FrameSource): Promise<boolean> {
  try {
    const { width, height } = exportDims(source);
    const codec = await getFirstEncodableVideoCodec(["avc"], { width, height });
    return codec !== null;
  } catch {
    return false;
  }
}

/**
 * Build the output audio track by copying source samples segment by segment.
 * Speed changes use nearest-sample resampling. Title segments are silence.
 * Returns null when there is nothing to export (example clip, muted, or the
 * file has no decodable audio).
 */
async function buildAudioBuffer(source: FrameSource, plan: Plan): Promise<AudioBuffer | null> {
  if (source.kind !== "file" || !source.url || plan.muted || plan.duration <= 0) return null;
  const res = await fetch(source.url);
  const bytes = await res.arrayBuffer();
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const src = await ctx.decodeAudioData(bytes);
    const rate = src.sampleRate;
    const channels = Math.min(2, src.numberOfChannels);
    const outLength = Math.max(1, Math.ceil(plan.duration * rate));
    const out = new AudioBuffer({ length: outLength, sampleRate: rate, numberOfChannels: channels });
    let outCursor = 0;
    for (const seg of plan.segments) {
      const outDur = segmentOutDur(seg);
      const outSamples = Math.floor(outDur * rate);
      if (seg.kind === "video") {
        for (let ch = 0; ch < channels; ch++) {
          const srcData = src.getChannelData(Math.min(ch, src.numberOfChannels - 1));
          const outData = out.getChannelData(ch);
          for (let i = 0; i < outSamples; i++) {
            const srcTime = seg.srcFrom + (i / rate) * seg.rate;
            const srcIdx = Math.floor(srcTime * rate);
            const outIdx = outCursor + i;
            if (srcIdx < srcData.length && outIdx < outLength) outData[outIdx] = srcData[srcIdx];
          }
        }
      }
      outCursor += outSamples;
    }
    return out;
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}

export async function exportMp4(opts: ExportOptions): Promise<ExportResult> {
  const { source, plan, onProgress, signal } = opts;
  const { width, height } = exportDims(source);

  const videoCodec = await getFirstEncodableVideoCodec(["avc"], { width, height });
  if (!videoCodec) throw new Error("no-h264");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");

  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, { codec: "avc", bitrate: QUALITY_HIGH });
  output.addVideoTrack(videoSource, { frameRate: EXPORT_FPS });

  let note: string | undefined;
  let audioBuffer: AudioBuffer | null = null;
  let audioSource: AudioBufferSource | null = null;
  try {
    const aac = await getFirstEncodableAudioCodec(["aac"]);
    if (aac) {
      audioBuffer = await buildAudioBuffer(source, plan);
      if (audioBuffer) {
        audioSource = new AudioBufferSource({ codec: "aac", bitrate: QUALITY_MEDIUM });
        output.addAudioTrack(audioSource);
      }
    }
  } catch {
    audioBuffer = null;
    audioSource = null;
  }
  if (!audioBuffer && source.kind === "file" && !plan.muted) {
    note = "Audio could not be read from this file, so the MP4 is video only.";
  }

  await output.start();

  let video: HTMLVideoElement | undefined;
  if (source.kind === "file" && source.url) {
    video = createVideoElement(source.url);
    await new Promise<void>((resolve, reject) => {
      video!.addEventListener("loadeddata", () => resolve(), { once: true });
      video!.addEventListener("error", () => reject(new Error("decode-failed")), { once: true });
    });
  }

  try {
    if (audioSource && audioBuffer) await audioSource.add(audioBuffer);

    const totalFrames = Math.max(1, Math.ceil(plan.duration * EXPORT_FPS));
    for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) {
        await output.cancel();
        throw new DOMException("Export canceled", "AbortError");
      }
      const t = Math.min(i / EXPORT_FPS, plan.duration);
      if (video) {
        const lookup = outputToSource(plan, t);
        if (lookup.kind === "video") await exactSeek(video, lookup.srcTime);
      }
      drawPlanFrame({ ctx, source, plan, t, width, height, video });
      await videoSource.add(t, 1 / EXPORT_FPS);
      onProgress((i + 1) / totalFrames);
    }

    videoSource.close();
    audioSource?.close();
    await output.finalize();
  } finally {
    if (video) {
      video.pause();
      video.removeAttribute("src");
    }
  }

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error("empty-output");
  return { blob: new Blob([buffer], { type: "video/mp4" }), filename: "chat-video-edit.mp4", note };
}
