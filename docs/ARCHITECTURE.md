# Forms Offline — System Architecture & Data Layer Topology

Forms Offline is designed with a strict 4-layer architecture to guarantee 100% offline reliability, zero backend dependency, and long-term maintainability.

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Presentation & UI Layer (React, CSS, Virtual Grid) │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: Services & System Layer (Import/Export, Backup, PWA│
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Database Layer (Dexie.js IndexedDB Repositories)  │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Core Domain Engine (Pure TypeScript, Zero UI/DOM)  │
└─────────────────────────────────────────────────────────────┘
```

## Layer Contracts

1. **Layer 1 (Core)**: Pure TypeScript logic (`src/core/`). Zero React, zero DOM, zero browser dependencies. Contains types, canonical JSON stringifier, SHA-256 template fingerprint engine, WebCrypto E2EE primitives, branching evaluator, and Git-like merge engine.
2. **Layer 2 (Database)**: IndexedDB database abstraction using Dexie.js (`src/db/`). Manages local tables (`templates`, `submissions`, `userProfile`), compound indexes, and `navigator.storage.persist()`.
3. **Layer 3 (Services)**: Application services (`src/services/`). Export service (JSON, CSV, lazy XLSX), import validators, update checker (`UpdateService.ts`), and sync services.
4. **Layer 4 (UI)**: React component hierarchy (`src/ui/`). AppShell layout, Form Builder, Rapid Entry stepper with autosave, TanStack Virtualized Spreadsheet Grid CMS, Camera Capture Modal (`CameraCaptureModal.tsx` with WebRTC hardware switching), In-App Media Preview Lightbox Modal (`MediaPreviewModal.tsx`), Guided PWA Install Modal (`InstallAppModal.tsx`), Conflict Resolver Modal, Privacy Modal, and Deekshith Vodela attribution footer.
