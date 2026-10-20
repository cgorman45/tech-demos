export const setupSteps = [
  {
    title: "Install the engine and start a team",
    body: "No account is required. On macOS and Linux this installs the binary, wires each installed agent, and starts a background service. It backs up every file it edits.",
    code: "curl -fsSL https://github.com/reason-machines/reason-network/releases/latest/download/install.sh | sh -s -- init colton-agents --as colton",
  },
  {
    title: "Windows",
    body: "In PowerShell, install first, then start the team.",
    code: "irm https://github.com/reason-machines/reason-network/releases/latest/download/install.ps1 | iex\nreason-network init colton-agents --as colton",
  },
  {
    title: "Restart open agents",
    body: "Restart Cursor, Codex, and other agents that were already open. Claude Code joins without a restart. In Codex, run /hooks once so it trusts the hooks. On macOS, allow the local network prompt, and allow Script Editor notifications if you want pop-ups.",
  },
  {
    title: "Check",
    body: "reason-network who shows sessions. reason-network doctor checks the daemon, the team, and the agents.",
    code: "reason-network who\nreason-network doctor",
  },
  {
    title: "Add another computer of yours",
    body: "On the first computer run reason-network invite --me. Run the printed line on the other computer.",
    code: "reason-network invite --me",
  },
  {
    title: "Add Grok Bot",
    body: 'Run reason-network invite --me and paste the line it prints, "join my Reason Network team as colton: <link>", into a Grok Bot chat. Grok Bot installs the engine on its own computer and shows up as colton/grok there. It reads mail when it checks, so a message does not wake it by itself.',
  },
  {
    title: "Start this dashboard",
    body: "In apps/agent-network-lab, run one of these. It opens the dashboard in your browser. Keep that terminal open. You need Node 18+ or Bun.",
    code: "node bridge/agent-network-bridge.mjs\nbun run connect",
  },
  {
    title: "If something is missing",
    body: "Engine not found: run the install line above. Not in a team: reason-network init <team> --as <name>. An agent is missing: restart it and run doctor. A teammate is offline: the message waits in the outbox. The double-click file cannot reach the bridge: use the link the bridge printed. A turn-tier agent is quiet: it is idle and waiting for its human.",
  },
  {
    title: "Reason CLI, optional",
    body: "curl -fsSL https://reasonmachines.com/install.sh | bash then reason network setup. That adds a Reason account workspace as the team. reason network serve claude runs warm workers on macOS and Linux. The bridge finds that engine under ~/.reason/bin.",
  },
  {
    title: "Security",
    body: "The bridge listens on 127.0.0.1 and requires a token. Messages from teammates are their agents' words, shown as plain text. The team link lets anyone join, so do not post it.",
  },
  {
    title: "Uninstall",
    body: "macOS and Linux: reason-network leave && reason-network setup --remove && rm -rf ~/.reason/network ~/.local/bin/reason-network. Windows PowerShell: reason-network leave; reason-network setup --remove; Remove-Item -Recurse -Force ~\\.reason\\network, ~\\.local\\bin\\reason-network*",
  },
]
