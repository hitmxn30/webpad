"use client";

export type ConsoleLevel = "log" | "warn" | "error";

export interface ConsoleMessage {
  id: number;
  level: ConsoleLevel;
  args: unknown[];
}

interface Props {
  messages: ConsoleMessage[];
  onClear: () => void;
}

const LEVEL_STYLES: Record<ConsoleLevel, string> = {
  log:   "text-primary",
  warn:  "text-warning",
  error: "text-error",
};

function formatArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  if (typeof arg === "object" && arg !== null && "__error" in arg) {
    const e = arg as { name?: string; message?: string };
    return `${e.name ?? "Error"}: ${e.message ?? ""}`;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export default function ConsolePanel({ messages, onClear }: Props) {
  return (
    <div className="h-48 shrink-0 border-t border-line bg-canvas flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-line bg-surface shrink-0">
        <span className="text-xs font-medium text-primary uppercase tracking-wide">Console</span>
        <button
          onClick={onClear}
          className="text-xs text-secondary hover:text-primary transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto font-mono text-xs">
        {messages.length === 0 ? (
          <div className="px-3 py-2 text-muted">No output yet.</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-1 border-b border-subline whitespace-pre-wrap break-words animate-slide-in-up ${LEVEL_STYLES[msg.level]}`}
            >
              {msg.args.map(formatArg).join(" ")}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
