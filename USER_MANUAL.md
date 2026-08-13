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
- [Step 8: Data Export Formats, Consolidation Strategy & Multi-Sheet Excel](#step-8-data-export-formats-consolidation-strategy--multi-sheet-excel)
- [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)

---

## Step 1: Quick Start, PWA Installation & Operator Setup

### **1. Accessing the Application**
- Open Forms Offline in Chrome, Edge, Safari, Firefox, or Brave or launch the application directly from your desktop / home screen.

### **2. Installing as a Standalone App (Zero-Internet PWA)**
- **Header Button**: Click the **"Install App"** button (downward arrow icon) in the top navigation header bar.
- **Desktop (Chrome/Edge)**: Click "Install" in the modal or the browser address bar icon to install as a standalone desktop window.
- **Mobile (Android)**: Tap "Install App" to mint a native WebAPK icon on your home screen.
- **Mobile (iOS Safari)**: Tap the browser Share button -> tap **"Add to Home Screen"**.
- Once installed, **Forms Offline launches instantly in under 1 second with 100% zero network dependency**! Workbox precaches all 41 application bundles locally.

### **3. Setting Up Your Operator Profile Alias**
- Click the Profile icon in the top header bar to open the **Operator Profile** modal.
- Enter your name or ID (e.g. `"Operator 1"`, `"Field Inspector #14"`).
- This alias is stamped into all local submission provenance logs and CSV/Excel exports.

---

## Step 2: Importing Google Forms & Microsoft Forms

Convert live Google Forms and Microsoft Forms links into 100% offline form templates!

### **Option A: 1-Click Link Import (Recommended)**
1. In Forms Dashboard, click **"Import"** -> **"Import from Link"** (`Sparkles` icon).
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
- **15 Supported Question Types**: Text, Textarea, Number, Select Dropdown, Radio, Checkbox, Date, Time, Location/Region, Digital Signature Canvas, Physical Form Camera Photo Capture, File Upload (up to 1 GB), Linear Scale (0–10), Rating Stars, Image Cards, and Title Blocks.
- **Multi-Page Physical Form Camera Capture**: Configure max photos (up to 20 pages) to capture physical paper forms (Front, Back, Pages 1-20). On desktops and laptops, choose between built-in webcams, external USB document cameras, and overhead scanners.
- **1 GB File Upload Support**: Allow respondents to upload files up to 1,000 MB (1 GB) and up to 20 files per field with specific MIME type validation.
- **Option Branching**: Set target sections per answer choice (*"Go to Section 3"*, *"Submit Form"*).
- **Form Settings**: Toggle End-to-End Encryption (E2EE), Progress Bar, Draft Recovery, or custom Confirmation Messages.

---

## Step 5: Rapid Field Data Entry & Debounced Autosave

- **Stepper Navigation**: Progress bar reflects percentage completion in real time. Use `Tab` to navigate inputs.
- **Live Camera Viewfinder & Multi-Page Snapshots**: Click "Take Photo" to launch the WebRTC camera viewfinder. Capture high-resolution snapshots, review freeze-frame previews, and attach multiple pages with automatic page tagging.
- **Digital Signatures**: Draw directly inside the touch-enabled signature canvas widget using a mouse, stylus, or finger.
- **300ms Debounced Autosave**: Responses are saved automatically after 300ms of inactivity into local IndexedDB (`sub_[templateId]_draft`). Press `Ctrl+S` for manual save.
- **Clean Submission**: Clicking *"Submit Record"* validates responses, stamps operator provenance, saves final completed submission, and purges temporary drafts.

---

## Step 6: Dataset CMS, In-App Document Viewer with Zoom & Virtualized Spreadsheet

- **High-Performance Grid**: Virtualized rendering (@tanstack/react-virtual) supports thousands of records with zero lag.
- **Native In-App Visual PDF Viewer with Zoom**: Renders multi-page PDF documents directly on high-resolution HTML5 canvases via `pdfjs-dist`. Use header zoom controls (`Zoom In +`, `Zoom Out -`, `Reset 100%`, 50%–300%) or mobile pinch-to-zoom to inspect fine print and signatures in-app.
- **Native DOCX & Spreadsheet In-App Parsers**: Parses Microsoft Word (`.docx`) XML structure and Excel (`.xlsx`, `.xls`, `.csv`) workbooks in-memory using `jszip` and SheetJS with zero external tabs or downloads.
- **Universal Light & Dark Mode Theming**: All preview modals, document viewers, and CMS tables adapt instantly to the active theme.
- **Safe Same-Origin Direct File Downloads**: Downloads trigger directly in the active window without `about:blank` navigation, preventing browser security download warnings.
- **Editing Submission Entries**: Click **"Edit Entry"** (Pencil icon) on any row to open the inline record editor. Modify responses, retake photos, or upload additional files. Edits are recorded silently in cryptographic version history.
- **Audit Provenance Inspector**: Click **"Record Detail & Audit Log"** (Info icon) to view ISO timestamps, operator attribution, and SHA-256 payload signatures.
- **Single & Bulk Deletions**: Delete individual rows or check multiple rows for batch purge with confirmation modals.

---

## Step 7: Data Consolidator & Cross-Device Union Merging

- **Collecting Response Packages**: Click **"Share / Export"** -> **"Export Response Package (.formdata)"** or **"Export Portable ZIP (.zip)"** to export datasets collected across field devices.
- **Multi-Device Merge**: Go to the **Data Consolidator** tab and upload `.formdata` or `.zip` packages. The engine computes SHA-256 signatures, performs union deduplication, and flags structural schema conflicts for side-by-side resolution.
- **Full Database Backup**: Export `.formbackup` files to create full system snapshots of all templates, submissions, and settings.

---

## Step 8: Data Export Formats, Consolidation Strategy & Multi-Sheet Excel

### **Consolidation Strategy Guide**
- **Forms WITHOUT File Attachments**: The **Response Package (`.formdata`)** export is the optimal format. It provides compact, instant JSON data exchange between offline devices and rapid union consolidation.
- **Forms WITH File Attachments (Images, PDFs, Signatures)**: The **ZIP Package (`.zip`)** export is the optimal strategy. The ZIP package bundles `Responses.xlsx` alongside the self-contained `attachments/` directory with relative cell references. ZIP packages can be imported directly into the **Data Consolidator** across field devices!

### **Export Formats Summary**
- **Standard CSV Export (.csv)**: Generates standard CSV with `Submitted At (UTC)` strictly formatted as Column 1.
- **4-Sheet Comprehensive Excel Workbook (.xlsx)**: Generates a 4-sheet Excel file:
  - **Sheet 1 (`Submissions`)**: Clean response data.
  - **Sheet 2 (`Field Codebook`)**: Variable metadata, data types, options, and validations.
  - **Sheet 3 (`Summary Stats`)**: Total responses, completion counts, and attachment metrics.
  - **Sheet 4 (`Version Audit Log`)**: Full audit trails of creation and edit timestamps.
- **Response Package (.formdata)**: Raw canonical JSON payload formatted for multi-device consolidation and text editor readability.
- **Portable ZIP Archive (.zip)**: Complete portable dataset bundling Excel spreadsheets with relative attachments for human inspection and machine consolidation.

---

## Frequently Asked Questions (FAQ)

### **Q: Is any data sent to external servers?**
> No. Forms Offline operates 100% client-side with zero telemetry, zero analytics tracking, and zero cloud backends.

### **Q: How large can uploaded files be and how much data can be stored?**
> Forms Offline supports up to **1 GB (1,000 MB) per file upload** and 20 files per field. The application automatically requests persistent browser storage (`navigator.storage.persist()`), allowing 5GB to 50GB+ of local disk quota depending on your hard drive space.

### **Q: How do I use external USB cameras or overhead document scanners?**
> Connect your USB webcam or document scanner before clicking "Take Photo". In the in-app camera modal, use the camera dropdown selector to choose your external camera hardware.

### **Q: What happens if I clear my browser history?**
> Clearing browser site data will erase IndexedDB storage! Always export regular backups by going to **Data Consolidator** -> **"Export Database Backup (.formbackup)"**.

---

*Forms Offline — Designed & Developed by Deekshith Vodela ([https://linktr.ee/deekshithvodela](https://linktr.ee/deekshithvodela))*
