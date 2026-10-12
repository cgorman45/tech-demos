import { outputToSource } from "@/features/plan/buildPlan";
import { createVideoElement, exactSeek } from "@/features/media/frameSource";
import { drawPlanFrame } from "@/features/render/drawFrame";
import { exportDims, type ExportOptions, type ExportResult } from "./exportMp4";

const FPS = 30;

/**
 * Fallback when H.264 encoding is unavailable: render the plan frame by frame
 * into a canvas stream and record it with MediaRecorder as WebM. Runs close
 * to real time because MediaRecorder captures live.
 */
export async function exportWebm(opts: ExportOptions): Promise<ExportResult> {
  const { source, plan, onProgress, signal } = opts;
  const { width, height } = exportDims(source);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");

  const stream = canvas.captureStream(FPS);
  const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
  if (!mime) throw new Error("no-webm");
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let video: HTMLVideoElement | undefined;
  if (source.kind === "file" && source.url) {
    video = createVideoElement(source.url);
    await new Promise<void>((resolve) =>
      video!.addEventListener("loadeddata", () => resolve(), { once: true }),
    );
  }

  recorder.start(250);
  const totalFrames = Math.max(1, Math.ceil(plan.duration * FPS));
  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal.aborted) {
        recorder.stop();
        throw new DOMException("Export canceled", "AbortError");
      }
      const t = Math.min(i / FPS, plan.duration);
      if (video) {
        const lookup = outputToSource(plan, t);
        if (lookup.kind === "video") await exactSeek(video, lookup.srcTime);
      }
      drawPlanFrame({ ctx, source, plan, t, width, height, video });
      onProgress((i + 1) / totalFrames);
      // Hold each frame on screen long enough for the live capture.
      await new Promise((r) => setTimeout(r, 1000 / FPS));
    }
  } finally {
    if (video) {
      video.pause();
      video.removeAttribute("src");
    }
  }

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.stop();
  await done;
  return {
    blob: new Blob(chunks, { type: "video/webm" }),
    filename: "chat-video-edit.webm",
    note: "H.264 encoding is not available in this browser, so the export is WebM instead of MP4.",
  };
}
