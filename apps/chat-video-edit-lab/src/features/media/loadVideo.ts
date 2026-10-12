import type { FrameSource } from "./frameSource";
import { createVideoElement } from "./frameSource";

/**
 * Wrap a user video file as a frame source. The file becomes an object URL;
 * the source itself holds no video element. Preview panes and the exporter
 * each create their own element from `url` so seeks never fight each other.
 */
export function loadVideoFile(file: File): Promise<FrameSource> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const probe = createVideoElement(url);
    probe.addEventListener("loadedmetadata", () => {
      if (!probe.videoWidth || !Number.isFinite(probe.duration)) {
        URL.revokeObjectURL(url);
        reject(new Error("This file has no decodable video track."));
        return;
      }
      resolve({
        kind: "file",
        name: file.name,
        duration: probe.duration,
        width: probe.videoWidth,
        height: probe.videoHeight,
        url,
        draw(ctx, _srcTime, dx, dy, dw, dh, video) {
          const el = video ?? probe;
          if (el.readyState >= 2) ctx.drawImage(el, dx, dy, dw, dh);
          else {
            ctx.fillStyle = "#000";
            ctx.fillRect(dx, dy, dw, dh);
          }
        },
      });
    });
    probe.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("The browser could not decode this video."));
    });
  });
}

export const ACCEPTED_TYPES = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
