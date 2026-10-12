/**
 * A frame source is anything that can draw the frame at a source time onto a
 * canvas. The example clip renders procedurally. File sources wrap a hidden
 * video element; callers manage its currentTime (loose sync for preview,
 * exact seeks for export).
 */
export interface FrameSource {
  kind: "example" | "file";
  name: string;
  duration: number;
  width: number;
  height: number;
  /** Object URL for file sources, used to create extra video elements. */
  url?: string;
  /** Draw the frame for srcTime into the destination rect. */
  draw(
    ctx: CanvasRenderingContext2D,
    srcTime: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    video?: HTMLVideoElement,
  ): void;
}

export function createVideoElement(url: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.src = url;
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  return video;
}

/** Seek a video element and resolve once the frame is ready. */
export function exactSeek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001));
    if (Math.abs(video.currentTime - target) < 0.001 && video.readyState >= 2) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      resolve();
    };
    video.addEventListener("seeked", finish);
    setTimeout(finish, 2000);
    video.currentTime = target;
  });
}

/** Fit a source rect into a destination box, keeping aspect. */
export function fitRect(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}
