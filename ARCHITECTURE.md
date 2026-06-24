# Webpad Architecture

## Component Tree

```mermaid
graph TD
    A["Next.js App (page.tsx)"]
    B["Playground.tsx\n(state owner)"]
    C["FileTreePanel.tsx\n(file list + CRUD)"]
    D["EditorPanel.tsx\n(Monaco, ssr:false)"]
    E["PreviewFrame.tsx\n(iframe, ssr:false)"]
    F["ConsolePanel.tsx\n(log messages)"]

    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
```

## Data Flow

```mermaid
flowchart LR
    subgraph Browser
        subgraph Playground["Playground.tsx — state: ProjectState + srcdoc"]
            FTP["FileTreePanel\n(files, activeFileId)"]
            EP["EditorPanel\n(activeFile)"]
            PF["PreviewFrame\n(srcdoc)"]
            CP["ConsolePanel\n(messages)"]
        end

        subgraph Libs["src/lib/"]
            BS["buildSrcdoc.ts\n(pure fn)"]
            ST["storage.ts\n(localStorage)"]
            US["urlState.ts\n(LZ hash)"]
            TY["types.ts\n(ProjectState / ProjectFile)"]
        end

        subgraph Iframe["sandboxed iframe (null origin)"]
            CI["CONSOLE_INTERCEPT\nscript"]
            UJ["user JS + HTML + CSS"]
        end
    end

    EP -- "onChange(id, content)" --> Playground
    FTP -- "onActivate / onCreate / onRename\n/ onDelete / onReorder" --> Playground

    Playground -- "500ms debounce" --> BS
    BS -- srcdoc --> PF
    PF -- "sets srcdoc" --> Iframe

    Playground -- "writeStoredState()" --> ST
    Playground -- "writeHash()" --> US

    ST -- "readStoredState()" --> Playground
    US -- "decodeStateFromHash()" --> Playground

    CI -- "postMessage {type:'console'}" --> Playground
    Playground -- "setMessages()" --> CP
```

## State Hydration Order

```mermaid
flowchart TD
    M["mount (useEffect)"]
    H{"URL hash\npresent?"}
    L{"localStorage\npresent?"}
    D["hardcoded defaults"]

    M --> H
    H -- yes --> S["use hash state"]
    H -- no --> L
    L -- yes --> S2["use localStorage state"]
    L -- no --> D
```

## iframe Isolation Model

```mermaid
flowchart LR
    subgraph Host["Host window (Next.js)"]
        PL["Playground.tsx"]
        PM["postMessage listener\n(validates type/level/args)"]
    end

    subgraph Sandbox["iframe  sandbox='allow-scripts'\n(null origin — no allow-same-origin)"]
        CI["CONSOLE_INTERCEPT\n(injected by buildSrcdoc)"]
        UJS["user HTML / CSS / JS"]
    end

    PL -- "srcdoc" --> Sandbox
    CI -- "window.parent.postMessage\n{type, level, args}" --> PM
    PM -- "setMessages()" --> PL
```

## Key Files

| Path | Role |
|---|---|
| `src/app/page.tsx` | Next.js route — renders `<Playground />` |
| `src/components/Playground.tsx` | Single state owner; wires all panels |
| `src/components/EditorPanel.tsx` | Monaco editor (one instance, swaps file on tab change) |
| `src/components/PreviewFrame.tsx` | Renders sandboxed `<iframe srcdoc>` |
| `src/components/ConsolePanel.tsx` | Displays postMessage logs from iframe |
| `src/components/FileTreePanel.tsx` | File list with create / rename / delete / drag-reorder |
| `src/lib/buildSrcdoc.ts` | Pure fn: assembles HTML+CSS+JS into an srcdoc string |
| `src/lib/storage.ts` | Read/write `ProjectState` to `localStorage` |
| `src/lib/urlState.ts` | LZ-compress state into/from URL hash |
| `src/lib/types.ts` | `ProjectFile`, `ProjectState`, migration helpers |
