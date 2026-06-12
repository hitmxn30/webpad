"use client";

import { useState, useEffect, useRef } from "react";
import { type ProjectFile } from "@/lib/types";

interface FileTreePanelProps {
  files: ProjectFile[];
  activeFileId: string;
  onActivate: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  triggerCreate: number;
}

function isNameTaken(name: string, files: ProjectFile[], excludeId?: string): boolean {
  return files.some(
    (f) => f.id !== excludeId && f.name.toLowerCase() === name.toLowerCase()
  );
}

export default function FileTreePanel({
  files,
  activeFileId,
  onActivate,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  triggerCreate,
}: FileTreePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Prevents double-commit when Enter triggers blur on the rename input
  const renameCancelRef = useRef(false);

  useEffect(() => {
    if (triggerCreate > 0) {
      setIsCreating(true);
      setNewFileName("");
    }
  }, [triggerCreate]);

  function startEditing(file: ProjectFile) {
    renameCancelRef.current = false;
    setEditingId(file.id);
    setEditingName(file.name);
  }

  function handleRenameBlur() {
    if (!editingId) return;
    if (!renameCancelRef.current) {
      const trimmed = editingName.trim();
      if (trimmed && !isNameTaken(trimmed, files, editingId)) {
        onRename(editingId, trimmed);
      }
    }
    renameCancelRef.current = false;
    setEditingId(null);
  }

  function handleRenameKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      renameCancelRef.current = true;
      (e.target as HTMLInputElement).blur();
    }
  }

  function handleCreateKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = newFileName.trim();
      if (trimmed && !isNameTaken(trimmed, files)) {
        onCreate(trimmed);
      }
      setIsCreating(false);
      setNewFileName("");
    }
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewFileName("");
    }
  }

  function isLastHtml(file: ProjectFile): boolean {
    return (
      file.language === "html" &&
      files.filter((f) => f.language === "html").length === 1
    );
  }

  function handleDelete(e: React.MouseEvent, file: ProjectFile) {
    e.stopPropagation();
    if (isLastHtml(file)) return;
    if (window.confirm(`Delete ${file.name}?`)) onDelete(file.id);
  }

  const multipleHtml = files.filter((f) => f.language === "html").length > 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-line shrink-0">
        <span className="text-xs font-medium text-primary uppercase tracking-wide">
          Files
        </span>
        <button
          onClick={() => {
            setIsCreating(true);
            setNewFileName("");
          }}
          className="text-secondary hover:text-primary text-base leading-none px-1"
          title="New file (⌘N)"
        >
          +
        </button>
      </div>

      {/* Multiple-HTML warning */}
      {multipleHtml && (
        <div className="px-3 py-1.5 text-xs text-warning border-b border-line shrink-0">
          ⚠ Only first HTML file is rendered
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            draggable
            onDragStart={() => setDraggedId(file.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedId && draggedId !== file.id) onReorder(draggedId, file.id);
              setDraggedId(null);
            }}
            onDragEnd={() => setDraggedId(null)}
            onClick={() => {
              if (editingId !== file.id) onActivate(file.id);
            }}
            className={[
              "group flex items-center gap-1 py-1 cursor-pointer select-none text-xs",
              file.id === activeFileId
                ? "bg-elevated text-primary border-l-2 border-accent pl-[6px] pr-2"
                : "px-2 text-secondary hover:bg-elevated hover:text-primary",
              file.id === draggedId ? "opacity-40" : "",
            ].join(" ")}
          >
            {editingId === file.id ? (
              <input
                className="flex-1 min-w-0 bg-elevated text-primary text-xs px-1 py-0.5 rounded outline-none border border-accent"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleRenameKey}
                onBlur={handleRenameBlur}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span
                  className="flex-1 min-w-0 truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(file);
                  }}
                >
                  {file.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(file);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-primary shrink-0 leading-none px-0.5 transition-opacity"
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => handleDelete(e, file)}
                  disabled={isLastHtml(file)}
                  className={
                    isLastHtml(file)
                      ? "shrink-0 leading-none px-0.5 opacity-30 cursor-not-allowed text-muted"
                      : "shrink-0 leading-none px-0.5 opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-opacity"
                  }
                  title={
                    isLastHtml(file)
                      ? "Cannot delete the only HTML file"
                      : `Delete ${file.name}`
                  }
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}

        {/* New-file input */}
        {isCreating && (
          <div className="px-2 py-1">
            <input
              className="w-full bg-elevated text-primary text-xs px-1 py-0.5 rounded outline-none border border-accent"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={handleCreateKey}
              onBlur={() => {
                setIsCreating(false);
                setNewFileName("");
              }}
              placeholder="filename.js"
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}
