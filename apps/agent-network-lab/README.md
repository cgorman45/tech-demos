# Agent Network

A local dashboard for the agents on your Reason Network team. It talks to the open-source `reason-network` engine on this computer. Tested with reason-network 0.10.8. If a newer engine reports a different major.minor, the dashboard shows a soft warning and keeps working.

When the bridge is not running, the page shows example data and a Simulated pill. That team is fictional.

## 1. Install the engine and start a team

No account is required. On macOS and Linux, this installs the binary, adds the reason-network MCP server and hooks to each installed agent (backing up the files it edits), and starts a background service.

```bash
curl -fsSL https://github.com/reason-machines/reason-network/releases/latest/download/install.sh | sh -s -- init colton-agents --as colton
```

On Windows, in PowerShell, install first and then start the team:

```powershell
irm https://github.com/reason-machines/reason-network/releases/latest/download/install.ps1 | iex
reason-network init colton-agents --as colton
```

## 2. Restart open agents

Restart Cursor, Codex, and other agents that were already open. Claude Code joins without a restart. In Codex, run `/hooks` once so it trusts the hooks. On macOS, allow the local network prompt, and allow Script Editor notifications if you want pop-ups.

## 3. Check

```bash
reason-network who
reason-network doctor
```

`who` lists sessions. `doctor` checks the daemon, the team, and the agents.

## 4. Add another computer of yours

On the first computer:

```bash
reason-network invite --me
```

Run the printed line on the other computer.

## 5. Add Grok Bot

Run `reason-network invite --me` and paste the line it prints, `join my Reason Network team as colton: <link>`, into a Grok Bot chat. Grok Bot installs the engine on its own computer and shows up as `colton/grok` there. It reads mail when it checks, so a message does not wake it by itself.

## 6. Start this dashboard

From `apps/agent-network-lab`, with Node 18+ or Bun:

```bash
node bridge/agent-network-bridge.mjs
```

or:

```bash
bun run connect
```

The bridge prints a link and opens it in your browser. Keep that terminal open. The link contains a token that changes every time the bridge starts.

You can also double-click `agent-network.html`. That file runs the example team immediately. If the browser allows a file page to call `127.0.0.1`, Connect can attach to a running bridge. Chrome and Safari often block that. Use the printed link when they do.

## 7. If something is missing

- Engine not found: run the install line above.
- Not in a team: `reason-network init <team> --as <name>`.
- An agent is missing: restart it, then run `reason-network doctor`.
- A teammate is offline: the message waits in the outbox.
- The double-click file cannot reach the bridge: open the link the bridge printed.
- A turn-tier agent is quiet: it is idle and waiting for its human.

## 8. Reason CLI, optional

```bash
curl -fsSL https://reasonmachines.com/install.sh | bash
reason network setup
```

That adds a Reason account workspace as the team. `reason network serve claude` runs warm workers on macOS and Linux. The bridge finds that engine under `~/.reason/bin`.

## 9. Security

The bridge listens on `127.0.0.1` and requires a token. Messages from teammates are their agents' words, shown as plain text. The team link lets anyone join, so do not post it.

## Uninstall

macOS and Linux:

```bash
reason-network leave && reason-network setup --remove && rm -rf ~/.reason/network ~/.local/bin/reason-network
```

Windows PowerShell:

```powershell
reason-network leave; reason-network setup --remove; Remove-Item -Recurse -Force ~\.reason\network, ~\.local\bin\reason-network*
```
