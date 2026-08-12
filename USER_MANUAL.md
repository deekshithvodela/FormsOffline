# Forms Offline — Official Help & Knowledge Base

Welcome to **Forms Offline**, a zero-backend, zero-telemetry, 100% offline-first web application designed for secure field data collection, form authoring, Google/MS Form link importing, and multi-device spreadsheet consolidation.

---

## 📋 Table of Contents

- [Step 1: Quick Start, PWA Installation & Operator Setup](#step-1-quick-start-pwa-installation--operator-setup)
- [Step 2: Importing Google Forms & Microsoft Forms](#step-2-importing-google-forms--microsoft-forms)
- [Step 3: Forms Dashboard & Template Lifecycle Management](#step-3-forms-dashboard--template-lifecycle-management)
- [Step 4: Form Authoring, Question Widgets & Option Branching](#step-4-form-authoring-question-widgets--option-branching)
- [Step 5: Rapid Field Data Entry & Debounced Autosave](#step-5-rapid-field-data-entry--debounced-autosave)
- [Step 6: Dataset CMS, Record Editing & Virtualized Spreadsheet](#step-6-dataset-cms-record-editing--virtualized-spreadsheet)
- [Step 7: Data Consolidator & Cross-Device Union Merging](#step-7-data-consolidator--cross-device-union-merging)
- [Step 8: Data Export Formats & Multi-Sheet Excel Generation](#step-8-data-export-formats--multi-sheet-excel-generation)
- [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)

---

## Step 1: Quick Start, PWA Installation & Operator Setup

### **1. Accessing the Application**
- Open Forms Offline in Chrome, Edge, Safari, Firefox, or Brave or launch the application directly from your desktop / home screen.

### **2. Installing as a Desktop / Mobile PWA**
- **Desktop (Chrome/Edge)**: Click the **Install** icon (computer with down arrow) in the browser address bar.
- **Mobile (Android/iOS)**: Open menu -> tap **"Add to Home Screen"**.
- Once installed, **Forms Offline launches instantly with 100% zero network dependency**!

### **3. Setting Up Your Operator Profile Alias**
- Click the Profile icon in the top header bar to open the **Operator Profile** modal.
- Enter your name or ID (e.g. `"Operator 1"`, `"Field Inspector #14"`).
- This alias is stamped into all local submission provenance logs and CSV/Excel exports.

---

## Step 2: Importing Google Forms & Microsoft Forms

Convert live Google Forms and Microsoft Forms links into 100% offline form templates!

### **Option A: 1-Click Link Import (Recommended)**
1. In Forms Dashboard, click **"Import"** -> **"Import Google / MS Link"** (`Sparkles` icon).
2. Paste any public form URL (supports `/viewform`, `/edit`, `/formResponse`, or short URLs like `forms.gle/...`).
3. Click **"Convert & Create Offline Form"**. The app automatically parses questions, section breaks (`Page 1 of N`), choice options, scale bounds, and text inputs!

### **Option B: Offline Page Source / HTML Fallback**
1. Open the saved Google Form HTML page in your browser.
2. Press `Ctrl+U` (View Page Source) and copy all text (`Ctrl+A` -> `Ctrl+C`).
3. Paste the text into the **"Page Source / HTML"** tab inside Forms Offline.

---

## Step 3: Forms Dashboard & Template Lifecycle Management

- **Collect Data**: Opens the Rapid Entry stepper for field data collection.
- **View Records**: Opens the virtualized Dataset CMS grid pre-filtered for that form.
- **Duplicate & Remix**: Click `•••` (More Actions) -> **"Duplicate & Remix"** to clone a form safely into a fresh editable draft without corrupting active records.
- **Template Packages**: Export `.formsoffline` template files to share across team devices.

---

## Step 4: Form Authoring, Question Widgets & Option Branching

- **Sections**: Click `+ Add Section` to create section breaks. Click `Reorder Sections` to drag sections with automatic `"Section X of N"` visual grouping.
- **Supported Question Types**: Text, Textarea, Number, Select Dropdown, Radio, Checkbox, Date, Time, Location/Region, Digital Signature Canvas, Linear Scale (0–10), Rating Stars, Image Cards, and Title Blocks.
- **Option Branching**: Set target sections per answer choice (*"Go to Section 3"*, *"Submit Form"*).
- **Form Settings**: Toggle End-to-End Encryption (E2EE), Progress Bar, Draft Recovery, or custom Confirmation Messages.

---

## Step 5: Rapid Field Data Entry & Debounced Autosave

- **Stepper Navigation**: Progress bar reflects percentage completion in real time. Use `Tab` to navigate inputs.
- **Digital Signatures**: Draw directly inside the touch-enabled signature canvas widget using a mouse, stylus, or finger.
- **300ms Debounced Autosave**: Responses are saved automatically after 300ms of inactivity into local IndexedDB (`sub_[templateId]_draft`). Press `Ctrl+S` for manual save.
- **Clean Submission**: Clicking *"Submit Record"* validates responses, stamps operator provenance, saves final completed submission, and purges temporary drafts.

---

## Step 6: Dataset CMS, Record Editing & Virtualized Spreadsheet

- **High-Performance Grid**: Virtualized rendering (@tanstack/react-virtual) supports thousands of records with zero lag.
- **Editing Submission Entries**: Click **"Edit Entry"** (Pencil icon) on any row to open the inline record editor. Edits are recorded silently in cryptographic version history.
- **Audit Provenance Inspector**: Click **"Record Detail & Audit Log"** (Info icon) to view ISO timestamps, operator attribution, and SHA-256 payload signatures.
- **Single & Bulk Deletions**: Delete individual rows or check multiple rows for batch purge with confirmation modals.

---

## Step 7: Data Consolidator & Cross-Device Union Merging

- **Collecting Response Packages**: Click **"Share / Export"** -> **"Export Response Package (.formdata)"** to export JSON payloads collected across field devices.
- **Multi-Device Merge**: Go to the **Data Consolidator** tab and upload `.formdata` response packages. The engine computes SHA-256 signatures, performs union deduplication, and flags structural schema conflicts for side-by-side resolution.
- **Full Database Backup**: Export `.formbackup` files to create full system snapshots of all templates, submissions, and settings.

---

## Step 8: Data Export Formats & Multi-Sheet Excel Generation

- **Standard CSV Export (.csv)**: Generates standard CSV with `Submitted At (UTC)` strictly formatted as Column 1.
- **Multi-Sheet Excel Workbook (.xlsx)**: Generates a 2-sheet Excel file:
  - **Sheet 1 (`Submissions`)**: Clean response data.
  - **Sheet 2 (`Version Audit Log`)**: Full audit trails of creation and edit timestamps.
- **Response Package (.formdata)**: Raw canonical JSON payload for cross-device consolidation.

---

## Frequently Asked Questions (FAQ)

### **Q: Is any data sent to external servers?**
> No. Forms Offline operates 100% client-side with zero telemetry, zero analytics tracking, and zero cloud backends.

### **Q: How many records can Forms Offline store?**
> Forms Offline can store tens of thousands of submissions, limited only by your browser's local disk quota (typically 5GB to 50GB+).

### **Q: What happens if I clear my browser history?**
> Clearing browser site data will erase IndexedDB storage! Always export regular backups by going to **Data Consolidator** -> **"Export Database Backup (.formbackup)"**.

---

*Forms Offline — Designed & Developed by Deekshith Vodela ([https://linktr.ee/deekshithvodela](https://linktr.ee/deekshithvodela))*
