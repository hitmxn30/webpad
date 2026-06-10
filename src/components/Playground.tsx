"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import ConsolePanel, { ConsoleMessage, ConsoleLevel } from "./ConsolePanel";
import FileTreePanel from "./FileTreePanel";
import { buildSrcdoc } from "@/lib/buildSrcdoc";
import { readStoredState, writeStoredState } from "@/lib/storage";
import { decodeStateFromHash, writeHash } from "@/lib/urlState";
import {
  type ProjectFile,
  type ProjectState,
  generateFileId,
  inferLanguage,
} from "@/lib/types";

const EditorPanel = dynamic(() => import("./EditorPanel"), { ssr: false });
const PreviewFrame = dynamic(() => import("./PreviewFrame"), { ssr: false });

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

const DEFAULT_STATE: ProjectState = {
  version: 2,
  activeFileId: "html-index",
  files: [
    { id: "html-index", name: "index.html", language: "html",       content: DEFAULT_HTML },
    { id: "css-style",  name: "style.css",  language: "css",        content: DEFAULT_CSS },
    { id: "js-script",  name: "script.js",  language: "javascript", content: DEFAULT_JS },
  ],
};

function resolveInitialState(): ProjectState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const fromHash = decodeStateFromHash(window.location.hash);
  if (fromHash) return fromHash;
  const fromStorage = readStoredState();
  if (fromStorage) return fromStorage;
  return DEFAULT_STATE;
}

export default function Playground() {
  const [project, setProject] = useState<ProjectState>(DEFAULT_STATE);
  const [srcdoc, setSrcdoc] = useState(() => buildSrcdoc(DEFAULT_STATE.files));
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newFileTrigger, setNewFileTrigger] = useState(0);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIdRef = useRef(0);

  const activeFile: ProjectFile =
    project.files.find((f) => f.id === project.activeFileId) ??
    project.files[0] ??
    DEFAULT_STATE.files[0];

  // Hydrate from URL hash → localStorage → defaults after mount.
  useEffect(() => {
    const initial = resolveInitialState();
    setProject(initial);
    setSrcdoc(buildSrcdoc(initial.files));
    setHydrated(true);
  }, []);

  const rebuild = useCallback((files: ProjectFile[]) => {
    setSrcdoc(buildSrcdoc(files));
    setMessages([]);
  }, []);

  // Debounced rebuild + persistence.
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      rebuild(project.files);
      writeStoredState(project);
      writeHash(project);
    }, 500);
    return () => clearTimeout(id);
  }, [project, hydrated, rebuild]);

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

  // Keyboard shortcuts.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "Enter") {
          e.preventDefault();
          rebuild(project.files);
        }
        if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          setSidebarOpen((o) => !o);
        }
        if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          setNewFileTrigger((c) => c + 1);
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [project, rebuild]);

  function handleFileChange(id: string, content: string) {
    setProject((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, content } : f)),
    }));
  }

  function handleSetActiveFile(id: string) {
    setProject((prev) => ({ ...prev, activeFileId: id }));
  }

  function handleCreateFile(name: string) {
    const id = generateFileId();
    const language = inferLanguage(name);
    setProject((prev) => ({
      ...prev,
      activeFileId: id,
      files: [...prev.files, { id, name, language, content: "" }],
    }));
  }

  function handleRenameFile(id: string, newName: string) {
    setProject((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === id ? { ...f, name: newName } : f)),
    }));
  }

  function handleDeleteFile(id: string) {
    setProject((prev) => {
      const files = prev.files.filter((f) => f.id !== id);
      const activeFileId =
        prev.activeFileId === id ? (files[0]?.id ?? "") : prev.activeFileId;
      return { ...prev, files, activeFileId };
    });
  }

  function handleReorderFiles(draggedId: string, targetId: string) {
    setProject((prev) => {
      const files = [...prev.files];
      const fromIdx = files.findIndex((f) => f.id === draggedId);
      const toIdx = files.findIndex((f) => f.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [item] = files.splice(fromIdx, 1);
      files.splice(toIdx, 0, item);
      return { ...prev, files };
    });
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopyState("copied");
    } catch {
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
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-[200px] shrink-0 border-r border-gray-700 flex flex-col bg-gray-900">
          <FileTreePanel
            files={project.files}
            activeFileId={project.activeFileId}
            onActivate={handleSetActiveFile}
            onCreate={handleCreateFile}
            onRename={handleRenameFile}
            onDelete={handleDeleteFile}
            onReorder={handleReorderFiles}
            triggerCreate={newFileTrigger}
          />
        </div>
      )}

      {/* Editor column */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-gray-700">
        {/* Editor toolbar: sidebar toggle + active filename */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-900 shrink-0">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-gray-400 hover:text-white text-sm font-mono px-1 shrink-0"
            title="Toggle sidebar (⌘B)"
          >
            ≡
          </button>
          <span className="text-xs text-gray-300 truncate">{activeFile.name}</span>
        </div>
        <div className="flex-1 min-h-0">
          <EditorPanel file={activeFile} onChange={handleFileChange} />
        </div>
      </div>

      {/* Preview + Console column */}
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
            {copyState === "copied"
              ? "Copied!"
              : copyState === "failed"
              ? "Failed — copy manually"
              : "Copy link"}
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {hydrated ? (
            <PreviewFrame srcdoc={srcdoc} />
          ) : (
            <div className="w-full h-full bg-white" />
          )}
        </div>
        <ConsolePanel messages={messages} onClear={handleClearConsole} />
      </div>
    </div>
  );
}
