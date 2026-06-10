"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import PreviewFrame from "./PreviewFrame";
import ConsolePanel, { ConsoleMessage, ConsoleLevel } from "./ConsolePanel";
import { buildSrcdoc } from "@/lib/buildSrcdoc";
import { readStoredState, writeStoredState, type EditorState } from "@/lib/storage";
import { decodeStateFromHash, writeHash } from "@/lib/urlState";

const EditorPanel = dynamic(() => import("./EditorPanel"), { ssr: false });

const DEFAULT_HTML = `<h1>Hello, webpad!</h1>
<p>Edit the panels on the left to see changes here.</p>
<button onclick="handleClick()">Click me</button>`;

const DEFAULT_CSS = `body {
  font-family: sans-serif;
  padding: 2rem;
  background: #f9fafb;
  color: #111;
}

h1 {
  color: #2563eb;
}

button {
  margin-top: 1rem;
  padding: 0.5rem 1.25rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #1d4ed8;
}`;

const DEFAULT_JS = `function handleClick() {
  alert('Hello from webpad!');
}`;

type Lang = "html" | "css" | "javascript";

const DEFAULT_STATE: EditorState = {
  html: DEFAULT_HTML,
  css: DEFAULT_CSS,
  javascript: DEFAULT_JS,
};

function resolveInitialState(): EditorState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const fromHash = decodeStateFromHash(window.location.hash);
  if (fromHash) return fromHash;
  const fromStorage = readStoredState();
  if (fromStorage) return fromStorage;
  return DEFAULT_STATE;
}

export default function Playground() {
  const [values, setValues] = useState<EditorState>(DEFAULT_STATE);
  const [srcdoc, setSrcdoc] = useState(() =>
    buildSrcdoc(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS)
  );
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIdRef = useRef(0);

  // Hydrate from URL hash → localStorage → defaults after mount (avoids SSR mismatch).
  useEffect(() => {
    const initial = resolveInitialState();
    setValues(initial);
    setSrcdoc(buildSrcdoc(initial.html, initial.css, initial.javascript));
    setHydrated(true);
  }, []);

  const rebuild = useCallback((next: EditorState) => {
    setSrcdoc(buildSrcdoc(next.html, next.css, next.javascript));
    setMessages([]);
  }, []);

  // Debounced rebuild + persistence (localStorage + URL hash).
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      rebuild(values);
      writeStoredState(values);
      writeHash(values);
    }, 500);
    return () => clearTimeout(id);
  }, [values, hydrated, rebuild]);

  // Receive console messages from sandboxed iframe.
  useEffect(() => {
    function handler(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "console") return;
      const level = data.level as ConsoleLevel;
      if (level !== "log" && level !== "warn" && level !== "error") return;
      const args = Array.isArray(data.args) ? (data.args as unknown[]) : [];
      messageIdRef.current += 1;
      setMessages((prev) => [...prev, { id: messageIdRef.current, level, args }]);
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Cmd+Enter / Ctrl+Enter triggers immediate rebuild.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        rebuild(values);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [values, rebuild]);

  function handleChange(lang: Lang, value: string) {
    setValues((prev) => ({ ...prev, [lang]: value }));
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopyState("copied");
    } catch {
      // clipboard access denied in some browsers/contexts
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopyState("failed");
    }
    copiedTimerRef.current = setTimeout(() => setCopyState("idle"), 1500);
  }

  function handleClearConsole() {
    setMessages([]);
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <div className="flex-1 min-w-0 border-r border-gray-700">
        <EditorPanel values={values} onChange={handleChange} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
          <span className="text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">⌘</kbd>
            <span className="mx-1">+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">Enter</kbd>
            <span className="ml-2">to run</span>
          </span>
          <button
            onClick={handleCopyLink}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Failed — copy manually" : "Copy link"}
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <PreviewFrame srcdoc={srcdoc} />
        </div>
        <ConsolePanel messages={messages} onClear={handleClearConsole} />
      </div>
    </div>
  );
}
