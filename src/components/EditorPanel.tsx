"use client";

import Editor from "@monaco-editor/react";
import { type ProjectFile } from "@/lib/types";

interface Props {
  file: ProjectFile;
  onChange: (id: string, content: string) => void;
}

export default function EditorPanel({ file, onChange }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <Editor
          path={file.id}
          height="100%"
          language={file.language}
          value={file.content}
          theme="vs-dark"
          onChange={(v) => onChange(file.id, v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
