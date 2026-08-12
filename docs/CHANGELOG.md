# Changelog — Forms Offline

All notable changes to **Forms Offline** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-12

### Added
- **CMS File Attachment Editing**: Inline file upload, attachment badge preview, removal, and replacement support in `EditSubmissionModal`.
- **ZIP Package Ingestion in Data Consolidator**: Support for ingesting `.zip` export archives alongside `.formdata` JSON packages in `DataConsolidator`.
- **Consolidation Strategy Guide**: Comprehensive documentation added to `USER_MANUAL.md` and in-app `HelpTab` recommending `.formdata` for forms without files and `.zip` packages for forms with attached media/files.

### Fixed
- **Rapid Entry Post-Submission Draft Persistence**: Immediately clear pending `autosaveTimerRef` upon final submission to prevent background autosave timers from recreating draft records post-submission.
- **Form Data Text Editor Line Length**: Formatted `.formdata` JSON export with multi-line indents (`JSON.stringify(pkg, null, 2)`), preventing 260,000+ single-line editor truncation warnings when inspecting attached Base64 files.

---

## [1.0.0] - 2026-08-11

### Added
- **Pure Core Domain Engine (Layer 1)**: Pure TypeScript domain models, canonical SHA-256 fingerprinting, WebCrypto E2EE primitives, Section Branching evaluator, and Git-like record merge engine.
- **Dexie IndexedDB Database (Layer 2)**: Offline-first IndexedDB schema with compound indexes and automatic `navigator.storage.persist()` storage requests.
- **Form Builder Authoring UI (Layer 4)**: Drag-and-drop section authoring, question validation, branching logic editor, and sandbox preview mode.
- **Rapid Data Entry Engine**: High-velocity stepper UI with keyboard shortcuts (`Tab`, `Ctrl+S`), 300ms debounced autosave, and `beforeunload` data loss protection.
- **TanStack Virtualized Spreadsheet CMS**: Smooth 60fps grid rendering for 10k-100k records with fixed 36px row height, inline search, and Record Provenance audit drawer.
- **Import/Export Subsystem**: Support for `.formdata`, `.formsoffline`, `.formbackup` packages, standard CSV, and code-split SheetJS Excel (`import('xlsx')`).
- **Interactive Conflict Resolver**: Field-by-field interactive merge modal for multi-device record union.
- **Zero-Telemetry PWA & App Shell**: Workbox offline service worker, zero-telemetry `UpdateService`, Privacy Policy disclosure modal, and Deekshith Vodela footer attribution.
- **Capacitor Android APK Build Pipeline**: Native Capacitor setup & GitHub Actions workflow (`.github/workflows/android-release.yml`).
- **Documentation & Audit Checklist**: Full `docs/` suite and 7-matrix release audit checklist (`docs/AUDIT_CHECKLIST.md`).
