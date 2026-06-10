export type EditorState = {
  html: string;
  css: string;
  javascript: string;
};

const STORAGE_KEY = "webpad:state";

export function readStoredState(): EditorState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditorState>;
    if (
      typeof parsed.html === "string" &&
      typeof parsed.css === "string" &&
      typeof parsed.javascript === "string"
    ) {
      return { html: parsed.html, css: parsed.css, javascript: parsed.javascript };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredState(state: EditorState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
}
