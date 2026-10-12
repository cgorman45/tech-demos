# chat-video-edit-lab: plan

Approved by Colton on 2026-10-12. Inspired by Matt Palmer's post on chat-driven video editing (https://x.com/mattyp/status/2109475664629772522). The app must be fully self-contained in `apps/chat-video-edit-lab/` and must not import from, modify, or depend on any other app. You may read `apps/pipeline-motion-lab/` (PR #12, branch `cursor/pipeline-motion-lab-297d`) and `apps/bd-workflow-topology/` (PR #10, branch `cursor/bd-workflow-topology-605a`) for patterns: dark look, edit mode, localStorage persistence, vite-plugin-singlefile setup. These may be unmerged. Copy what you need; do not import.

## Goal
A local app where you drop in a short clip, type plain editing instructions in a chat box, and watch each one turn into a timeline step you can preview, undo, reorder, and export as an MP4.

## Audience and tone
- Audience: Colton and BD colleagues making quick clips for meetings and posts. It should look finished on a projector.
- Title on screen: "Chat Video Edit". No Willdan logo or company name anywhere.
- The bundled sample clip is labeled "Example clip" (badge in the top bar while it is loaded).

## UI copy rules (every string in the app, README, and PR body)
- No em dashes (use commas, periods, colons, or parentheses).
- No "not just X but Y" constructions. No forced lists of three.
- No buzzwords (leverage, synergy, supercharge, seamless, game-changing, unlock, revolutionize, cutting-edge, empower, robust, insights).
- Plain, short, concrete sentences.

## Core idea: an edit list, rendered on a canvas
The source video is never modified. The project is a source plus an ordered list of steps. A pure function `buildPlan(source, steps)` turns that into a render plan: output segments (source in/out, playback rate), overlays (title cards, captions, text), and the output duration. Preview and export both draw frames from the same plan onto a canvas, so what you see is what you export.

## Step types (MVP)
| type | params | example phrase |
|---|---|---|
| trim | start or end, seconds | "cut the first 3 seconds", "trim last 2s", "keep 0:04 to 0:12" |
| cut range | from, to | "remove 5s to 8s" |
| speed | factor, range (all, first/middle/last third, or from/to) | "speed up the middle", "slow down the end 0.5x", "2x from 3 to 6" |
| title card | text, seconds (default 2), position (start/end) | "add title card Q3 Pipeline", "end card Thanks for watching" |
| captions | segments [{from,to,text}] | "add captions" (uses text the user types or pastes after a prompt; ships example captions for the sample clip), "caption 0 to 3: Hello" |
| text overlay | text, from, to, corner | "put 'Draft' in the top right" |
| fade | in/out, seconds | "fade in", "fade out 1s" |
| mute | | "mute audio" |
| filter | grayscale / brightness / contrast | "make it black and white", "brighten a little" |

Ranges are resolved against the timeline as it stands after the previous steps (document this, test it). Words like "middle" mean the middle third of the current output.

## Command parser (no AI key needed)
- `features/parser/parse.ts`: a local rule-based parser. Split one message into clauses on commas, "and", "then", semicolons. Each clause matches against intent rules (verbs plus synonyms), with number parsing for "3", "three", "3s", "0:03", "1.5x", "half speed".
- Output per clause: a step, or an "I didn't understand" item with 2 to 3 suggested phrasings the user can click.
- Optional AI: a Settings dialog where the user can paste an API key (Anthropic or OpenAI compatible). If set, unparsed clauses are sent to the model with a JSON schema for the step types and the reply is validated with zod before becoming a step. The key lives only in localStorage and is never required. Default is off; the app must be fully usable without it, and nothing calls the network unless a key is set.
- The chat log shows the user message and the assistant reply listing the steps it added ("Added: Trim first 3.0s, Title card 'Q3 Pipeline' (2s), Speed 2x middle third, Captions (4 lines)").

## Single-user MVP
1. **Load media**: drag-and-drop zone and file picker for video (mp4, webm, mov where the browser can decode). Use an object URL. "Use example clip" button always available.
2. **Example clip**: do not commit a large binary. Generate the sample in the browser: a ~15 second procedural canvas animation (moving shapes, a ticking counter, scene labels "Scene 1" to "Scene 4", a simple tone track via WebAudio optional) treated as a source with the same frame interface as a real video. Label it "Example clip". If you instead bundle a real clip, it must be under 1.5 MB, license-free (self-generated), and inlined in the single-file build.
3. **Chat panel**: message box with Enter to send, chat history, suggestion chips with sample commands ("cut the first 3 seconds", "add title card Q3 Pipeline", "speed up the middle", "add captions").
4. **Timeline steps list**: each step is a card with an icon, a plain summary, and editable params (inline number and text fields). Drag to reorder (dnd-kit), toggle on/off, delete. Undo and Redo buttons plus Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z, covering add, edit, reorder, delete.
5. **Visual timeline strip**: under the preview, a bar showing output segments (colored by speed), title cards, and caption spans, with a playhead you can scrub.
6. **Before/after preview**: two modes, toggled: side by side (original left, edited right) and a single view with an A/B switch (hold B key or button). Play, Pause, scrub, and current time vs duration for each.
7. **Export MP4 in the browser**: use WebCodecs (VideoEncoder H.264 avc1, AudioEncoder AAC when supported) with `mediabunny` (or `mp4-muxer` if mediabunny is unavailable under minimumReleaseAge) to mux. Render frames by seeking through the plan on an offscreen canvas at 30 fps, 1280x720 max (keep aspect). Progress bar with Cancel. Output downloads as `chat-video-edit.mp4`. If WebCodecs or H.264 encoding is missing, fall back to MediaRecorder WebM with a clear note. Do NOT use ffmpeg.wasm: its worker and ~30 MB core cannot be inlined into the single-file build and fail from file://.
8. **Persistence**: steps, chat history, settings (not the video file) saved to localStorage under `chat-video-edit-lab:v1`. On reload, if the source was the example clip, restore it; if it was a user file, show "Re-add your clip to continue" with the file name and duration, and keep the steps. "Reset" clears steps and chat (confirm). "Export project" and "Import project" as JSON.
9. **Edit labels**: an "Edit" toggle in the top bar makes the app title and panel titles click-to-rename, saved to localStorage.
10. **Double-click build**: `bun run build:single` uses vite-plugin-singlefile to produce one self-contained HTML, committed as `apps/chat-video-edit-lab/chat-video-edit.html`. It must work opened from `file://` with no network: no external fonts, no CDN, no workers loaded from separate files (inline them or skip them), all assets inlined. Loading a local video, editing, preview, and MP4 export must all work from file://.

## Layout
Top bar: title, Example clip badge, Load video, Edit, Settings (optional AI key), Export project, Reset, Export MP4. Main: left column chat panel (~360px), center preview (before/after) with timeline strip below, right column steps list (~340px). Must have no overlaps or clipped text at 1440x900 and 1280x720. Dark theme.

## Structure
```
apps/chat-video-edit-lab/
  bunfig.toml  package.json  vite.config.ts  index.html  README.md  PLAN.md  chat-video-edit.html
  src/
    features/media/       (loadVideo.ts, exampleClip.ts, frameSource.ts, DropZone.tsx)
    features/parser/      (parse.ts, numbers.ts, rules.ts, aiFallback.ts, parse.test.ts)
    features/plan/        (steps.ts types, buildPlan.ts, buildPlan.test.ts)
    features/render/      (drawFrame.ts, overlays.ts, Preview.tsx, BeforeAfter.tsx, TimelineStrip.tsx)
    features/export/      (exportMp4.ts, exportWebm.ts, ExportDialog.tsx)
    features/chat/        (ChatPanel.tsx, Suggestions.tsx)
    features/steps/       (StepsList.tsx, StepCard.tsx)
    features/labels/      (EditableLabel.tsx, labels.ts)
    store/                (useProjectStore.ts: Zustand with persist, history for undo/redo)
    components/ui/        (shadcn)
```

## Tests (bun test, critical logic only)
- parser: the spec sentence "cut first 3 seconds, add title card Q3 Pipeline, speed up middle, add captions" yields exactly those 4 steps; number formats ("three", "0:03", "1.5x"); unknown clause returns suggestions.
- buildPlan: trim, cut range, speed on middle third, title card duration, output duration math, steps disabled, reorder changes result.
- undo/redo: add, edit, reorder, delete round trips.
- time mapping: output time to source time across speed changes.

## Stack
- Bun: runtime, package manager, scripts.
- Vite + React + TypeScript: one-screen app, no routing.
- Tailwind v4 + shadcn/ui (nova preset): Card, Button, Badge, Input, Textarea, Dialog, Tooltip, Slider, Progress, Switch, ScrollArea.
- Zustand with persist middleware: steps, chat, labels, settings, undo history.
- dnd-kit: reorder steps.
- WebCodecs + mediabunny (or mp4-muxer): MP4 export without servers or wasm.
- zod: validate optional AI replies and imported project JSON.
- vite-plugin-singlefile: double-click HTML.
- oxlint: fast lint.

## Deferred
- Auto-transcribed captions (needs speech model or API).
- Multiple clips, B-roll, music tracks.
- Server rendering or ffmpeg.wasm.
