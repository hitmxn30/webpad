import LZString from "lz-string";
import { type ProjectState, type EditorStateV1, migrateV1ToV2 } from "./types";

export function encodeStateToHash(state: ProjectState): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeStateFromHash(hash: string): ProjectState | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(raw);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed) as Record<string, unknown>;
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

export function writeHash(state: ProjectState): void {
  if (typeof window === "undefined") return;
  const encoded = encodeStateToHash(state);
  const newHash = `#${encoded}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
  }
}
