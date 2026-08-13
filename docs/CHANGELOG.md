# Changelog — Forms Offline

All notable changes to **Forms Offline** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-13

### Added
- **Physical Form Camera Photo Capture (`camera_photo`)**:
  - Live in-app WebRTC camera viewfinder with real-time video feed (`navigator.mediaDevices.getUserMedia`).
  - Multi-camera hardware selector (`navigator.mediaDevices.enumerateDevices`) supporting external USB webcams, overhead document cameras, and built-in cameras.
  - Multi-page capture support (Front, Back, Pages 1–20) for digitizing double-sided physical forms and multi-page documents.
- **1 GB File Uploads**:
  - Expanded per-file upload limit from 100 MB to **1,000 MB (1 GB)** with support for up to 20 files per field.
  - Added filename ellipsis truncation with full name hover tooltips to prevent layout overflow.
- **In-App Media Preview Lightbox Modal (`MediaPreviewModal`)**:
  - Full-screen media lightbox modal with carousel navigation (left/right keyboard arrows, full-res zoom, and download) to inspect images, documents, and camera photos with 0 external `about:blank` tabs.
- **4-Sheet Comprehensive Excel Generation (`Responses.xlsx`)**:
  - **Sheet 1 (`Submissions`)**: Clean response data.
  - **Sheet 2 (`Field Codebook`)**: Variable metadata, data types, options, and validations.
  - **Sheet 3 (`Summary Stats`)**: Total responses, completion counts, and attachment metrics.
  - **Sheet 4 (`Version Audit Log`)**: Full audit trails of creation and edit timestamps with provenance diffs.
- **PWA "Install as App" Header Button & Standalone Web App**:
  - Added dedicated `<button>` with downward arrow download icon (`ArrowDownToLine`) in the top navigation header.
  - Standalone mode auto-detection and guided platform installation modal (`InstallAppModal`) for Chrome/Edge desktop, Android WebAPK, and iOS Safari.
- **100% Zero-Internet Workbox Offline Precaching**:
  - Configured `workbox.navigateFallback: 'index.html'` and precached all 41 application bundles (1.23 MB) for instant sub-second boot during total network outages.
- **Accessibility (WCAG 2.1 AA) & Keyboard Focus**:
  - Added explicit `aria-label` attributes to all form controls, search bars, and dropdown selects (**0 missing label warnings**).
  - Added prominent `:focus-visible` outline rings for keyboard navigation.
- **CMS File Attachment Editing & ZIP Ingestion**:
  - Inline file upload, attachment badge preview, removal, and replacement support in `EditSubmissionModal`.
  - Ingestion of `.zip` export archives alongside `.formdata` JSON packages in `DataConsolidator`.

### Fixed
- **Filename & Photo Name Overflow**: Constrained filename badges and camera photo cards with ellipsis truncation, preventing horizontal scroll blowouts on mobile viewports.
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
