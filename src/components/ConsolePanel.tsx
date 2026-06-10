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
  log: "text-gray-100",
  warn: "text-yellow-400",
  error: "text-red-400",
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
    <div className="h-48 shrink-0 border-t border-gray-700 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
        <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Console</span>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto font-mono text-xs">
        {messages.length === 0 ? (
          <div className="px-3 py-2 text-gray-500">No output yet.</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`px-3 py-1 border-b border-gray-800 whitespace-pre-wrap break-words ${LEVEL_STYLES[msg.level]}`}
            >
              {msg.args.map(formatArg).join(" ")}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
