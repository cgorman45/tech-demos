# agent-network-lab: plan

Approved by Colton on 2026-10-19, then rescoped the same day: this is a working tool for Colton's real agents, with a simulator kept only as a labeled fallback. Inspired by Reason Network (https://x.com/reasonmachines/status/2111135100142518430, https://reasonmachines.com/network, docs https://docs.reasonmachines.com/docs/network). The message engine is open source: https://github.com/reason-machines/reason-network (Rust, MIT OR Apache-2.0, binary `reason-network`, latest release v0.10.8). Read its README.md, DESIGN.md, `src/proto.rs`, and `src/main.rs` before writing the bridge.

The app must be fully self-contained in `apps/agent-network-lab/` and must not import from, modify, or depend on any other app. You may read `apps/treg-people-search-lab/` (PR #14), `apps/chat-video-edit-lab/` (PR #13), `apps/pipeline-motion-lab/`, and `apps/bd-workflow-topology/` for patterns: dark look, edit mode, localStorage persistence, vite-plugin-singlefile setup. These may be unmerged. Copy what you need; do not import.

## Goal
A local dashboard for Colton's real Reason Network team: it shows every live agent session (person, computer, agent, repo@branch, busy or idle, what it is doing), sends real asks and handoffs, shows the real replies, and warns before two agents end up on the same repo and branch.

## Facts about the real engine (verified on 2026-10-19 by running v0.10.8 in an isolated sandbox)
- One daemon per computer, started on demand or as a launchd/systemd user service (on Windows a logon entry). Computers talk peer to peer over iroh QUIC: direct on the LAN via mDNS, hole-punched over the internet, or through an encrypted relay. State lives in `~/.reason/network` (override with `REASON_NETWORK_HOME`). Logs: `~/.reason/network/daemon.log`.
- Install with no account: `curl -fsSL https://github.com/reason-machines/reason-network/releases/latest/download/install.sh | sh` (macOS and Linux, checksum verified, into `~/.local/bin`). Windows: `irm https://github.com/reason-machines/reason-network/releases/latest/download/install.ps1 | iex`. The Reason CLI (`reason network ...`, closed source, macOS and Linux only, needs a Reason account) wraps the same engine and keeps its own copy under `~/.reason/bin`.
- Team: `reason-network init <team> --as <name>` starts one, `reason-network link` prints a reusable team link, `reason-network invite --me` gives a one-time code for another of your own computers or a cloud agent. `join <link or code> --as <name>` joins. `init` and `join` run `setup`, which wires installed agents (Claude Code, Codex, Cursor via `~/.cursor/mcp.json` + `hooks.json`, Gemini CLI, Copilot CLI, opencode, pi, Grok CLI via `~/.grok/config.toml`), backing up each file it edits, and installs the background service.
- Agents register themselves through the `reason-network` MCP server and hooks. They get the tools `list_team`, `send_message`, `ask_user`, `check_inbox`. What a session is doing is read from its own title and todo list; agents never report it.
- Delivery tiers (shown per session as `tier`): **push** wakes idle sessions (Claude Code, Codex, opencode, pi, Reason). **turn** sees mail at its next step, and an idle session waits for its human (Cursor, Gemini CLI, Copilot CLI, Grok CLI). **pull** only when it checks.
- Addresses: `person/session`, `session` when unique, `person/session@machine`, and the group forms `person/*`, `repo:<name>`, `*`. Group sends are allowed only from `<person>/terminal`, never from an agent.
- CLI surface the bridge uses (stable, documented):
  - `reason-network who --json [--all]` prints a `Directory`: `{team, person, machine, machines:[{person, machine, endpoint, is_me, online, link: "direct"|"relay"|null, rtt_ms, last_seen}], sessions:[{address, name, person, machine, agent, cwd, repo, branch, status: busy|idle|live|offline, since (ms), doing, tier, unread, is_me}]}`.
  - `reason-network team` shows machines and whether each is reached direct or via relay.
  - `reason-network listen --as dashboard --wait 600` registers `colton/dashboard`, blocks until mail arrives, prints `<reason-message from="..." agent="..." [repo="..."] [via="..."] id="...">body</reason-message>` blocks plus a hint line, marks them read, then exits. Run it again to keep listening. While it is waiting, a send to it reports `delivered: the session was waiting for messages`; otherwise `queued: it gets it the next time it listens`.
  - `reason-network send <to> --from colton/dashboard "<message>"` prints one line per recipient: `→ <address>: <state>: <note>` where state is `pushed`, `queued`, `inbox`, `held`, or `delivered`, then `message id <ulid>`. Add `--fyi` to not wake the recipient, `--notify` to pop it up on the person's screen, `--reply-to <id>` to thread.
  - Broadcast: run `reason-network listen --as terminal --wait 0` once to register `colton/terminal`, then `reason-network send '*' --from colton/terminal "..."`. Without `--from` from a script it fails with "only a person at a terminal sends to a group". A broadcast also lands in the dashboard's own inbox: filter out messages whose `from` is the dashboard itself or `via="*"` copies sent by us.
  - `reason-network doctor` checks the daemon, team links, and agents.
- The local socket (`~/.reason/network/network.sock`, newline-delimited JSON `{id, op, ...}`, ops `who`, `send`, `inbox`, `delivered`, `hook`, `team`) works and returns structured JSON, but it is an internal API with no compatibility promise, and on Windows it is a named pipe. Use the CLI as the transport. A socket transport is deferred.
- Not in the open engine: `serve` (warm headless workers like `reason network serve claude`) and Reason's MCP/workspace features exist only in the closed Reason CLI. File-overlap warnings are on the engine roadmap (M4) and not built, so collision warnings come from this app.
- The engine repo was created 2026-10-16 and v0.10.8 shipped 2026-10-19 at 3:25 PM PT. It moves fast. Record the tested version in the README, have the bridge read `reason-network --version`, and show a soft warning if the major.minor differs.

## Architecture
```
browser UI (React, single HTML)  <--HTTP + SSE, 127.0.0.1 only, token-->  bridge (Node 18+ or Bun, zero deps)
                                                                           |  spawns
                                                                           v
                                                         reason-network CLI  -->  local daemon  <-- iroh P2P -->  teammates and other computers
```
- A browser cannot reach a Unix socket or run the CLI, so a small local **bridge** is required for live mode. It is one zero-dependency file, `apps/agent-network-lab/bridge/agent-network-bridge.mjs` (written in TypeScript under `bridge/src/`, bundled with `bun build --target=node`, output committed), runnable with `node agent-network-bridge.mjs` or `bun agent-network-bridge.mjs`. `bun run connect` in the app folder does the same.
- The bridge:
  - Finds the binary: `REASON_NETWORK_BIN`, then `reason-network` on PATH, then `~/.local/bin/reason-network[.exe]`, then `~/.reason/bin/reason-network`. If none is found it still serves the UI and reports `engine: missing` with the install line for the OS.
  - Listens on `127.0.0.1:4777` (`--port` to change). Never binds 0.0.0.0.
  - Creates a random 32-byte token at start, prints `Open http://127.0.0.1:4777/#token=...`, and opens that URL in the default browser (`--no-open` to skip). Every `/api/*` request needs the token (`Authorization: Bearer` header, or `?token=` for the SSE stream). It rejects requests whose `Host` is not `127.0.0.1:<port>` or `localhost:<port>` (DNS rebinding) and whose `Origin` is anything other than its own origin or `null` (the double-click file).
  - Serves the built `agent-network.html` at `/`, so the main way in is the printed link, with no file:// limits.
  - Polls `who --json --all` every 2 s and pushes diffs over SSE `/api/events` (`directory`, `message`, `send_result`, `engine_status`, `error`).
  - Keeps a `listen --as dashboard --wait 600` loop always running (restart right away after each exit) and parses the `<reason-message>` blocks into `{id, from, agent, repo, via, body, receivedAt}`. A parse failure is sent to the UI as raw text, never dropped.
  - `POST /api/send {to, body, fyi?, notify?, replyTo?, kind: "ask"|"handoff"|"broadcast"}` runs `send` with arguments passed as an argv array (never through a shell), body via stdin with `-` so quoting cannot break, and returns parsed recipient states.
  - `GET /api/status` gives engine version, path, in-team or not, team name, person, this machine, and the tested version. `GET /api/doctor` returns `doctor` output as text.
  - Logs to stdout without message bodies. Stores nothing on disk.
- The **UI** talks only to a `NetworkSource` interface with two implementations: `LiveSource` (bridge) and `SimSource` (the simulator). On load it tries the bridge at the page's own origin, else `http://127.0.0.1:4777` with a token from the URL fragment or pasted into a Connect dialog. If it cannot connect, it falls back to SimSource and says so plainly.
- The double-click `agent-network.html` opened from `file://` runs the simulator right away and can connect to a running bridge if the browser allows a file page to call localhost. Chrome and Safari may block this; in that case the Connect dialog says to use the link the bridge printed.

## Audience and tone
- Audience: Colton first, for daily use. It should look finished.
- Title on screen: "Agent Network". No Willdan logo or company name anywhere. Do not use Reason's logo; a footer line "Built on the open-source Reason Network engine" with a link is fine.
- A large status pill in the top bar: green "Live: <team> as <person> on <machine>" when connected, amber "Simulated: example data" otherwise. In simulated mode every agent, computer, and reply is fictional and each reply carries a "simulated" tag. Live mode never shows example data mixed with real data.

## UI copy rules (every string in the app, README, and PR body)
- No em dashes (use commas, periods, colons, or parentheses).
- No "not just X but Y" constructions. No forced lists of three.
- No buzzwords (leverage, synergy, supercharge, seamless, game-changing, unlock, revolutionize, cutting-edge, empower, robust, insights).
- Plain, short, concrete sentences.

## Single-user MVP
1. **Connection and setup**:
   - Connect dialog: bridge URL, token, Test, and a checklist that reads `/api/status` (engine found, version, in a team, dashboard listening) with the exact next command for whatever is missing, for macOS/Linux and Windows.
   - A "Setup" tab that renders the README steps in the app.
   - Reconnects on its own when the bridge restarts.
2. **Live roster**: sessions grouped by person, then computer. Each row: address, agent with an icon chip, repo@branch, status with "for 12m" from `since`, `doing`, delivery tier badge with a tooltip in plain words ("Cursor reads this at its next step. If it is idle it waits for you."), unread count. Offline sessions shown faded with last seen, behind a "Show offline" toggle. Filter box matching person, agent, repo, or doing. Our own `dashboard` and `terminal` sessions are hidden by default.
3. **Network map**: SVG. Computers are rounded boxes holding session nodes. Lines between this computer and each other computer show the real link from `who`: solid for `direct` with `rtt_ms`, dashed through a relay icon for `relay`, grey for offline. Sending animates a dot along the line, and a reply animates back when it arrives. Use `motion`. Live mode only shows timing that came from real events (sent time, recipient state, reply time).
4. **Command box** (terminal style, history with up/down, Tab completes addresses from the live roster), parsed by a pure parser shared by both sources:
   - `ask <address> "<message>"`: sends, then waits for the next message from that address (or one whose reply id matches) and links the two. Shows "waiting, turn tier, may wait for its human" when relevant. Timeout default 10 minutes, with a Stop waiting button.
   - `tell <address> "<message>" [--fyi] [--notify]`: send without waiting.
   - `handoff <address> "<task>" [--repo <repo>] [--branch <branch>]`: sends a structured message, first line `Handoff from colton/dashboard: <task>`, then `Where: <repo>@<branch>` and `Reply with done, blocked, or a question.` Tracks the handoff as open, done, or blocked from the reply's first word, on a small Handoffs list.
   - `broadcast "<message>"`: the `*` send from `colton/terminal`, after a confirm dialog listing every recipient.
   - `who [filter]`, `doctor`, `help`, `clear`. In simulated mode also `serve <tool>`, `as <address>`, and `move <address> <repo>@<branch>`, which do nothing live and say why if typed while live.
   - Unknown address: friendly error and the closest address by edit distance. Clickable example chips fill in commands using real addresses when live.
5. **Collision warnings**:
   - Before a `handoff` with a repo or branch (or one taken from the target's current repo@branch), if another session that is busy or live, other than the target, is on the same repo and branch, show an amber dialog: "<address> is already working in <repo>@<branch> (<doing>). Ask it first?" with "Ask <address>" (prefills `ask`), "Send anyway", and "Cancel".
   - Always-on: a Collisions strip lists any two or more busy or live sessions on the same repo@branch right now, from the live directory, with an "Ask" button for each. Idle overlaps get a soft grey note.
   - Repo match compares the repo name case-insensitively and ignores a trailing `.git`; a missing branch never matches.
6. **Message log and timeline**: every send, recipient state, and incoming message in order, with from, to, kind, state, and elapsed ms between send and reply. Incoming messages show the sender's agent and repo. Message bodies from peers are rendered as plain text (never HTML or markdown links that run). Click an entry to replay it on the map. Copy as text and Export JSON. The log is kept in localStorage (last 500 entries) with a Clear button.
7. **Edit mode**:
   - Live: real sessions cannot be renamed from outside (the engine only lets a session rename itself). Edit sets local nicknames for people, computers, and sessions (shown with the real address underneath), hides or pins sessions, and colors computers.
   - Simulated: full editing of the example team (rename agents and computers, change repos, branches, and statuses, add and remove agents and computers).
   - Both save to localStorage under `agent-network-lab:v1` via Zustand persist. Reset (confirm) and Export / Import JSON (zod-validated with a clear error). The bridge token is kept only in sessionStorage.
8. **Simulated fallback**: the example team and routing simulator from the earlier plan: three fictional computers (`colton-mbp`, `maya-studio`, `build-box` relayed), about 7 fictional agents, seeded latency (same computer 2 to 10 ms, LAN 15 to 60 ms, relay 120 to 300 ms each way), warm replies in 1.5 to 2 s, busy targets queue, offline targets fail, a scripted 30 second Run demo with one collision. It uses the same `Directory` and message shapes as live, so the UI code paths are identical.
9. **Double-click build**: `bun run build:single` with vite-plugin-singlefile produces `apps/agent-network-lab/agent-network.html`, committed. The bridge serves this same file. It works from `file://` with no network in simulated mode: no external fonts, CDNs, workers, or separate asset files.

## README.md (Setup, plain language, both macOS/Linux and Windows)
1. Install the engine and start a team (no account): `curl -fsSL https://github.com/reason-machines/reason-network/releases/latest/download/install.sh | sh -s -- init colton-agents --as colton`. Windows PowerShell version from the engine README. Say what it changes: adds the reason-network MCP server and hooks to each installed agent (backing up files) and a background service. Uninstall line from the engine README.
2. Restart Cursor, Codex, and other agents that were open (Claude Code joins without a restart). In Codex, run `/hooks` once to trust them. On macOS, allow the local network prompt, and allow Script Editor notifications if you want pop-ups.
3. Check: `reason-network who` and `reason-network doctor`.
4. Add another computer of yours: `reason-network invite --me` on the first one, run the printed line on the other.
5. Add Grok Bot: run `reason-network invite --me` and paste the "join my Reason Network team as colton: <link>" line it prints into a Grok Bot chat. Grok Bot installs the engine on its own computer and appears as `colton/grok` there. It reads mail when it checks, so it does not wake up on a message by itself.
6. Start the dashboard: in `apps/agent-network-lab`, run `node bridge/agent-network-bridge.mjs` (or `bun run connect`). It opens the dashboard in your browser. Keep that terminal open. Needs Node 18+ or Bun.
7. Troubleshooting: engine not found, not in a team, an agent missing (restart it, run `doctor`), a teammate offline (messages wait in the outbox), the double-click file cannot reach the bridge (use the printed link), a turn-tier agent not answering (it is idle and waiting for its human).
8. Using the Reason CLI instead (optional): `curl -fsSL https://reasonmachines.com/install.sh | bash` then `reason network setup`. That adds a Reason account workspace as the team and `reason network serve claude` workers (macOS and Linux only). The bridge finds the engine under `~/.reason/bin`.
9. Security notes: bridge binds to 127.0.0.1 with a token; messages from teammates are their agents' words, shown as plain text; the team link lets anyone join, so do not post it.

## Structure
```
apps/agent-network-lab/
  bunfig.toml package.json vite.config.ts index.html README.md PLAN.md agent-network.html
  bridge/
    src/ (server.ts, auth.ts, engine.ts binary discovery + spawn, who.ts, listen.ts, parseMessages.ts, parseSendResult.ts, version.ts)
    test/ (parseMessages.test.ts, parseSendResult.test.ts, auth.test.ts, engine.test.ts with a fake binary, e2e.test.ts)
    fixtures/ (who.json, listen.txt, send.txt, broadcast.txt captured from a real sandbox run)
    agent-network-bridge.mjs   (bundled output, committed)
  src/
    features/source/    (NetworkSource.ts, LiveSource.ts, SimSource.ts, ConnectDialog.tsx, StatusPill.tsx)
    features/network/   (types.ts mirroring the engine's Directory/SessionInfo/MachineInfo, collisions.ts, collisions.test.ts)
    features/commands/  (parseCommand.ts, parseCommand.test.ts, suggest.ts, CommandBox.tsx, ExampleChips.tsx)
    features/handoffs/  (handoffs.ts, handoffs.test.ts, HandoffList.tsx)
    features/sim/       (seededRandom.ts, clock.ts, router.ts, simulator.ts, replies.ts, exampleTeam.ts, demoScript.ts, router.test.ts)
    features/roster/    (Roster.tsx, SessionRow.tsx, TierBadge.tsx)
    features/map/       (NetworkMap.tsx, MachineBox.tsx, SessionNode.tsx, MessageDot.tsx)
    features/log/       (MessageLog.tsx, logExport.ts)
    features/edit/      (EditableLabel.tsx, Nicknames.tsx, SimTeamEditor.tsx, importExport.ts, importExport.test.ts)
    features/setup/     (SetupTab.tsx)
    store/              (useAppStore.ts: Zustand persist)
    components/ui/      (shadcn)
```

## Tests (bun test, critical logic only)
- parseCommand: every command form, quoted messages with spaces and escaped quotes, flags in any order, unknown command, unknown address with suggestion, live-only vs sim-only commands.
- collisions: busy or live sessions on the same repo and branch flagged, the target excluded, different branch not flagged, idle overlap gives a soft note, `.git` and case normalized, missing branch never matches.
- bridge parsers against the captured fixtures: `<reason-message>` blocks with and without `repo`/`via`, multi-line bodies, bodies containing angle brackets; send result lines for each state; `who --json` validated with zod; unknown fields tolerated.
- bridge auth: missing or wrong token rejected, bad Host rejected, foreign Origin rejected, `null` Origin with a token accepted.
- engine: binary discovery order; argv-only spawn (a message with quotes, `$()`, and newlines arrives intact).
- handoffs: open, done, blocked from reply text.
- simulator: same seed gives the same events, relay vs direct latency ranges, busy queues, offline fails.
- e2e (runs when `reason-network` is available, skipped otherwise, and run once in your VM): set `REASON_NETWORK_HOME` to a temp dir, `init e2e --as colton --no-setup`, start the bridge, run a background `listen --as worker`, POST an ask to `colton/worker`, have the worker reply with `send colton/dashboard --from colton/worker`, and assert the reply arrives over SSE and the roster shows both sessions. Run `reason-network stop` and delete the temp dir after.

## Stack
- Bun: package manager, scripts, tests, bundling the bridge.
- Node 18+ or Bun at runtime for the bridge: built-ins only (`http`, `child_process`, `crypto`), no npm dependencies.
- Vite + React + TypeScript: one-screen app.
- Tailwind v4 + shadcn/ui (nova preset): Card, Button, Badge, Input, Dialog, AlertDialog, Switch, Table, ScrollArea, Tooltip, Tabs.
- motion: message dots and status changes.
- Zustand with persist: nicknames, sim team, log, settings.
- zod: engine JSON, bridge responses, imports.
- vite-plugin-singlefile: double-click HTML.
- oxlint: lint.

## Deferred
- Socket transport (structured JSON, faster) once the engine documents it as stable.
- A DIY warm worker (a `listen` loop that runs a headless Claude or Grok on each message), since `serve` lives only in the closed Reason CLI.
- Starting, stopping, or renaming real agents from the dashboard.
- Joining Cursor cloud agents to the network by default (they are short-lived VMs and would leave stale computers on the roster; a per-run one-time `invite --me` code is possible later).
- Approvals (`held`, `approve`, `reject`, `ask_user` answers) beyond showing them in the log.
- Running the bridge as a background service.
