"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import PreviewFrame from "./PreviewFrame";
import { buildSrcdoc } from "@/lib/buildSrcdoc";

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

export default function Playground() {
  const [values, setValues] = useState<Record<Lang, string>>({
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    javascript: DEFAULT_JS,
  });

  const [srcdoc, setSrcdoc] = useState(() =>
    buildSrcdoc(DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS)
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setSrcdoc(buildSrcdoc(values.html, values.css, values.javascript));
    }, 500);
    return () => clearTimeout(id);
  }, [values]);

  function handleChange(lang: Lang, value: string) {
    setValues((prev) => ({ ...prev, [lang]: value }));
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <div className="flex-1 min-w-0 border-r border-gray-700">
        <EditorPanel values={values} onChange={handleChange} />
      </div>
      <div className="flex-1 min-w-0">
        <PreviewFrame srcdoc={srcdoc} />
      </div>
    </div>
  );
}
