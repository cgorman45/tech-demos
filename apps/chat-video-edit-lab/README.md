# Chat Video Edit

Type plain editing instructions in a chat box and watch each one become a timeline step. Preview the result next to the original, reorder or undo steps, and export an MP4. Everything runs in the browser; no server, no upload.

Inspired by chat-driven video editing. See PLAN.md for the full plan.

## Run it

```sh
bun install
bun run dev
```

Or skip the toolchain: double-click `chat-video-edit.html`. It is a single self-contained file that works from `file://` with no network. Loading a local video, editing, preview, and MP4 export all work there.

## What you can type

- "cut the first 3 seconds", "trim last 2s", "keep 0:04 to 0:12"
- "remove 5s to 8s"
- "speed up the middle", "slow down the end 0.5x", "2x from 3 to 6"
- "add title card Q3 Pipeline", "end card Thanks for watching"
- "add captions", "caption 0 to 3: Hello"
- "put 'Draft' in the top right"
- "fade in", "fade out 1s"
- "mute audio"
- "make it black and white", "brighten a little"

Several instructions can go in one message, separated by commas, "and", or "then". The parser is local and rule-based; no AI key is needed. If a clause is not understood, the reply offers phrasings you can click.

Ranges resolve against the timeline as it stands after the previous steps. "Middle" means the middle third of the current output, so a speed step placed after a trim acts on the trimmed timeline. Drag steps to reorder and the result updates.

## How it works

The source video is never modified. The project is a source plus an ordered list of steps. `buildPlan(sourceDuration, steps)` turns that into a render plan: output segments (source in and out points, playback rate), overlays, fades, and the output duration. Preview and export draw frames from the same plan onto a canvas, so what you see is what you export.

- Example clip: a 15 second procedural canvas animation, generated in the browser. It is example data, labeled "Example clip" in the top bar. No binary is committed.
- Export: WebCodecs H.264 through mediabunny, 30 fps, up to 1280x720, downloaded as `chat-video-edit.mp4`. Audio from file sources is carried over when the browser can decode it (AAC); otherwise the export is video only and the dialog says so. If H.264 encoding is missing, the fallback is MediaRecorder WebM with a note.
- Persistence: steps, chat, labels, and settings live in localStorage under `chat-video-edit-lab:v1`. Video files are not stored; after a reload the app asks you to re-add the file and keeps your steps.
- Optional AI: Settings accepts an Anthropic or OpenAI compatible API key for clauses the local parser cannot read. The key stays in localStorage. With no key set, nothing calls the network.

## Scripts

| script | what it does |
|---|---|
| `bun run dev` | dev server |
| `bun test` | parser, plan, history, and time mapping tests |
| `bun run build` | typecheck and production build |
| `bun run build:single` | single-file build, written to `chat-video-edit.html` |
| `bun run lint` | oxlint |

## Limits

- Caption text is typed or pasted, not transcribed.
- One clip at a time; no music tracks or B-roll.
- Export speed depends on the machine; a 15 second clip takes roughly its own length.
