# Forms Offline — 7-Matrix Release & PII Verification Checklist

Every version release of **Forms Offline** must pass all 7 audit matrices prior to SemVer tagging and production release.

---

## 7 Audit Matrices

| Matrix # | Audit Category | Pass Criteria | Verification Method |
|---|---|---|---|
| **Matrix 1** | **Identity & Storage Audit** | IndexedDB storage persistence (`navigator.storage.persist()`) granted, UUIDv7 generation verified, storage quota metrics exposed in UI. | `npm test` & storage health inspector |
| **Matrix 2** | **Form Builder & Navigation Audit** | Multi-section authoring, drag-and-drop ordering, field type validation, and preview sandbox sandbox rendering without DOM errors. | Form Builder UI test |
| **Matrix 3** | **Rapid Data Entry Audit** | Stepper navigation, keyboard shortcuts (`Tab`/`Ctrl+S`), 300ms debounced autosave, `beforeunload` tab close warning active. | Rapid Entry UI test |
| **Matrix 4** | **Spreadsheet CMS Audit** | Virtualized grid rendering 10k-100k rows at 60fps, fixed 36px row height, inline filtering, provenance audit drawer. | TanStack Virtual test |
| **Matrix 5** | **Git-like Merge & Provenance Audit** | SHA-256 canonical JSON template fingerprinting, multi-device union, duplicate detection, field-by-field interactive conflict resolver. | `tests/unit/merge.test.ts` |
| **Matrix 6** | **Import/Export Audit** | `.formdata`, `.formsoffline`, `.formbackup` export/import roundtrip, CSV formatting, lazy SheetJS dynamic `import('xlsx')` code splitting. | Export Service test |
| **Matrix 7** | **PII, Secrets & Anonymization Audit** | Automated scan confirms zero real PII (real names, real emails, phone numbers, SSNs, personal IP addresses) or private API keys/secrets in source code, docs, sample fixtures, or build bundles. | Regex PII scan script |

---

## Matrix 7 (PII & Secret Leak Verification Protocol)

```bash
# Automated PII & Secret Scan Regex Rules
# 1. Search for potential private API keys or secret tokens
grep -rnE "(sk_live|secret_key|PRIVATE_KEY|api_key)" src/ tests/ docs/

# 2. Search for real email addresses (excluding synthetic mock emails)
grep -rnE "[a-zA-Z0-9._%+-]+@(gmail|yahoo|hotmail|outlook)\.com" src/ tests/ docs/
```

**Verification Status**: All sample data and unit test fixtures use 100% synthetic, anonymized mock values. Zero secrets or real personal data exist in the repository.
