import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EditableLabel } from "../edit/EditableLabel.tsx"
import { sessionLabel } from "../edit/Nicknames.tsx"
import { formatSince, type SessionInfo } from "../network/types.ts"
import { TierBadge } from "./TierBadge.tsx"

export function SessionRow({
  session,
  now,
  nicknames,
  pinned,
  editMode,
  onNickname,
  onHide,
  onPin,
}: {
  session: SessionInfo
  now: number
  nicknames: Record<string, string>
  pinned: boolean
  editMode: boolean
  onNickname: (value: string) => void
  onHide: () => void
  onPin: () => void
}) {
  const label = sessionLabel(session.address, nicknames)
  const faded = session.status === "offline"
  return (
    <div className={`rounded-lg border border-border/70 px-2 py-1.5 ${faded ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{label.title}</div>
          {label.subtitle ? <div className="truncate text-[11px] text-muted-foreground">{label.subtitle}</div> : null}
        </div>
        <Badge variant="secondary" className="shrink-0">
          {session.agent}
        </Badge>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
        <span>{session.repo && session.branch ? `${session.repo}@${session.branch}` : "no repo"}</span>
        <span>
          {session.status} {formatSince(session.since, now)}
        </span>
        {session.unread > 0 ? <span>{session.unread} unread</span> : null}
        <TierBadge agent={session.agent} tier={session.tier} />
        {pinned ? <span>pinned</span> : null}
      </div>
      {session.doing ? <div className="mt-1 truncate text-xs">{session.doing}</div> : null}
      {editMode ? (
        <div className="mt-1.5 flex items-center gap-1">
          <EditableLabel
            testId={`nickname-${session.address}`}
            value={nicknames[`session:${session.address}`] ?? ""}
            placeholder="Nickname"
            onChange={onNickname}
          />
          <Button type="button" size="xs" variant="outline" onClick={onPin}>
            {pinned ? "Unpin" : "Pin"}
          </Button>
          <Button type="button" size="xs" variant="ghost" onClick={onHide}>
            Hide
          </Button>
        </div>
      ) : null}
    </div>
  )
}
