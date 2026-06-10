import { type ProjectState, type EditorStateV1, migrateV1ToV2 } from "./types";

const STORAGE_KEY = "webpad:state";

export function readStoredState(): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // v2
    if (
      parsed?.version === 2 &&
      Array.isArray(parsed.files) &&
      (parsed.files as unknown[]).length > 0 &&
      typeof parsed.activeFileId === "string"
    ) {
      return parsed as unknown as ProjectState;
    }
    // v1 — migrate
    if (
      typeof parsed?.html === "string" &&
      typeof parsed?.css === "string" &&
      typeof parsed?.javascript === "string"
    ) {
      return migrateV1ToV2(parsed as unknown as EditorStateV1);
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredState(state: ProjectState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
}
