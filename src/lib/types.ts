export type Language = "html" | "css" | "javascript";

export interface ProjectFile {
  id: string;
  name: string;
  language: Language;
  content: string;
}

export interface ProjectState {
  version: 2;
  files: ProjectFile[];
  activeFileId: string;
}

export interface EditorStateV1 {
  html: string;
  css: string;
  javascript: string;
}

export function generateFileId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function inferLanguage(filename: string): Language {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  return "javascript";
}

export function migrateV1ToV2(v1: EditorStateV1): ProjectState {
  return {
    version: 2,
    activeFileId: "html-index",
    files: [
      { id: "html-index", name: "index.html", language: "html",       content: v1.html },
      { id: "css-style",  name: "style.css",  language: "css",        content: v1.css },
      { id: "js-script",  name: "script.js",  language: "javascript", content: v1.javascript },
    ],
  };
}
