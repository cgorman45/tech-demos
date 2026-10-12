const WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  "a half": 0.5,
  quarter: 0.25,
};

/** Parse "3", "3.5", "three", "3s", "3 sec", "3 seconds", "0:03", "1:30" into seconds. */
export function parseSeconds(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const clock = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (clock) return parseInt(clock[1], 10) * 60 + parseFloat(clock[2]);
  const num = s.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)?$/);
  if (num) return parseFloat(num[1]);
  const word = s.replace(/\s*(?:s|sec|secs|second|seconds)$/, "");
  if (word in WORDS) return WORDS[word];
  return null;
}

/** Parse a speed factor: "2x", "1.5x", "2", "double", "half", "half speed". */
export function parseFactor(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s*speed$/, "");
  if (s === "double") return 2;
  if (s === "triple") return 3;
  if (s === "half") return 0.5;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*x?$/);
  if (m) return parseFloat(m[1]);
  if (s in WORDS) return WORDS[s];
  return null;
}

/** Matches a time token anywhere in a clause: 0:03, 3s, 3 seconds, 3.5, three. */
export const TIME_TOKEN =
  "(?:\\d+:\\d{1,2}(?:\\.\\d+)?|\\d+(?:\\.\\d+)?\\s*(?:s|sec|secs|seconds?)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
