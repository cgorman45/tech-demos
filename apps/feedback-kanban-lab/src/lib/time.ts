/** Short relative timestamp, like the source board: "just now", "4m", "5h", "2d". */
export function relativeTime(from: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - from) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function initialsFor(handle: string): string {
  const parts = handle.split(/[._\s-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-sky-900 text-sky-200",
  "bg-violet-900 text-violet-200",
  "bg-emerald-900 text-emerald-200",
  "bg-amber-900 text-amber-200",
  "bg-rose-900 text-rose-200",
  "bg-cyan-900 text-cyan-200",
  "bg-indigo-900 text-indigo-200",
];

export function avatarColor(handle: string): string {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
