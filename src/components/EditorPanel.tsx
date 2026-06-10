"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

type Lang = "html" | "css" | "javascript";

const TABS: { lang: Lang; label: string }[] = [
  { lang: "html", label: "HTML" },
  { lang: "css", label: "CSS" },
  { lang: "javascript", label: "JS" },
];

interface Props {
  values: Record<Lang, string>;
  onChange: (lang: Lang, value: string) => void;
}

export default function EditorPanel({ values, onChange }: Props) {
  const [active, setActive] = useState<Lang>("html");

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-700 bg-gray-900 shrink-0">
        {TABS.map(({ lang, label }) => (
          <button
            key={lang}
            onClick={() => setActive(lang)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              active === lang
                ? "text-white border-b-2 border-blue-500 bg-gray-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={active}
          value={values[active]}
          theme="vs-dark"
          onChange={(v) => onChange(active, v ?? "")}
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
