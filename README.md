# 📋 Forms Offline — Zero-Backend Data Digitization & Form Authoring Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version: 1.1.0](https://img.shields.io/badge/Version-1.1.0-646CFF.svg)](#)
[![Offline First](https://img.shields.io/badge/Offline--First-100%25-brightgreen.svg)](#)
[![PWA Standalone](https://img.shields.io/badge/PWA-Standalone_Ready-purple.svg)](#)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-success.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](#)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](#)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-Zero-success.svg)](#)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](#)
[![Created by Deekshith Vodela](https://img.shields.io/badge/Author-Deekshith_Vodela-blueviolet.svg)](https://linktr.ee/deekshithvodela)

> **Zero-Backend, 100% Offline-First Data Digitization, Google/MS Form Link Importing & Cross-Device Data Consolidation Platform.**

---

## 🌟 Overview

**Forms Offline** is a modern, ultra-fast Progressive Web Application (PWA) designed for field surveys, physical paper form digitization, research data collection, medical registries, and remote operations where internet connectivity is unreliable or nonexistent. Built with React 18, TypeScript, Dexie IndexedDB, TanStack Virtualization, and WebCrypto E2EE, it operates entirely inside the browser with zero cloud servers or analytics tracking.

---

## 🔥 Key Features

### 🔌 1. 100% Offline-First Core & Zero-Internet Precaching
- All form templates, response data, operator profiles, and settings are stored locally in browser IndexedDB using **Dexie.js**.
- Workbox precaching caches all 41 application bundles with `navigateFallback: 'index.html'`, enabling continuous operation and instant boot during total network outages or remote field deployments.
- **Standalone PWA Install**: Install as a dedicated desktop or mobile windowed application with 1-click header install button.

### 🪄 2. Smart Form Importer (Google Forms & MS Forms)
- **1-Click Link Importer**: Paste any public Google Forms or Microsoft Forms response URL (`/viewform`, `/formResponse`, `forms.gle/...`) to instantly generate an offline template.
- **Offline HTML Fallback**: Convert offline page source HTML (`Ctrl+U`) using client-side regex DOM parsing without reaching external servers.

### 🎨 3. Visual Form Builder Canvas
- Author multi-section forms with 15 question widgets (Text, Select, Radio, Checkbox, Date/Time, Location, Digital Signature Canvas, Physical Form Camera Capture, 1 GB File Uploads, Rating Stars, Linear Scale, Image Cards).
- **Multi-Page Physical Form Camera Capture**: Configure multi-page camera capture (1–20 pages) for double-sided forms (Page 1 Front, Page 2 Back, Page 3+) with desktop USB document scanner and webcam hardware switcher.
- **1 GB File Uploads**: Upload up to 1,000 MB per file and 20 files per field with specific MIME type filtering.
- **Section Drag & Touch Reordering**: Intuitive section re-sequencing with automatic `Section X of N` visual grouping.
- **Option Branching**: Route respondents to specific sections or submission endpoints based on radio/dropdown selections.

### ⚡ 4. High-Velocity Rapid Data Entry
- Mobile-optimized stepper UI with progress bar tracking, live WebRTC camera viewfinder, and instant keyboard navigation (`Tab`, `Ctrl+S`).
- **300ms Debounced Autosave**: Draft responses are automatically saved every 300ms to prevent accidental data loss.
- **Touch-Enabled Digital Signatures**: Capture high-precision signatures directly on canvas widgets.

### 📊 5. Virtualized Dataset CMS & In-App Document Viewer with Zoom
- Smooth **60fps virtualized rendering** (`@tanstack/react-virtual`) handling 10,000+ submission records without layout distortion.
- **Native In-App Visual PDF Viewer with Zoom**: Renders multi-page PDF documents directly on high-resolution HTML5 canvases via `pdfjs-dist` with 50%–300% zoom controls, page badges (`Page 1 of N`), and mobile pinch-to-zoom.
- **Native DOCX & Spreadsheet In-App Parsers**: Parses Microsoft Word (`.docx`) XML structure and Excel (`.xlsx`, `.xls`, `.csv`) workbooks in-memory using `jszip` and SheetJS with zero external tabs or downloads.
- **Safe Same-Origin File Downloads**: Direct local file exports without `about:blank` bounce, completely eliminating browser insecure download warnings.
- **Universal Light & Dark Mode Theming**: Full theme reactivity across all modals, grids, document viewers, and action palettes.
- Inline record editor, single & bulk deletion, and SHA-256 payload audit trails.
- Automatic operator alias & device identifier provenance stamping on every response.

### 🔄 6. Cross-Device Data Consolidator & Union Merging
- Export portable `.formdata` response packages and `.zip` archives across field devices.
- Merge packages into a master dataset with automatic SHA-256 fingerprint deduplication and interactive side-by-side conflict resolution.
- Export full database snapshots (`.formbackup`) for zero-loss recovery.

### 📑 7. Code-Split Multi-Format Exports
- **Standard CSV Export (`.csv`)**: Clean spreadsheet export formatted for immediate analysis.
- **4-Sheet Comprehensive Excel Workbook (`.xlsx`)**: Comprehensive workbook featuring raw submissions (Sheet 1), Field Codebook (Sheet 2), Summary Stats (Sheet 3), and version audit trails (Sheet 4). SheetJS is code-split dynamically to keep initial page loads under 200KB.
- **Portable ZIP Package (`.zip`)**: Complete archive bundling Excel spreadsheets with relative file attachments.
- **WebCrypto E2EE Encryption**: Optional 256-bit AES-GCM encryption for zero-trust data sharing.

---

## 🛠️ Technology Stack

- **Framework**: React 18, TypeScript 5.5, Vite 5.4
- **Styling**: Modular CSS Component Architecture (`src/styles/theme.css`, `src/styles/components.css`)
- **Database**: Dexie.js (IndexedDB wrapper)
- **Virtualization**: `@tanstack/react-virtual`
- **Icons**: Lucide React
- **PWA Capabilities**: `vite-plugin-pwa`, Service Worker caching
- **Testing**: Vitest, Playwright

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/formsoffline.git
cd formsoffline

# Install dependencies
npm install
```

### 3. Running Locally
```bash
# Start local development server on http://localhost:8080
npm run dev
```

### 4. Running Unit Tests
```bash
# Execute Vitest test suite
npm test
```

### 5. Production Build
```bash
# Compile TypeScript and build production bundle
npm run build
```

---

## 🏗️ Project Architecture

```
src/
├── core/             # Canonical data types, schemas, and template hashers
├── db/               # Dexie IndexedDB models and database migrations
├── services/         # Importer, Exporter, Encryption, & Union Merge engine
├── styles/           # Global CSS variables (theme.css) & Modular Design System (components.css)
├── ui/               # Component Views:
│   ├── builder/      # Form Builder canvas & section reordering
│   ├── cms/          # Virtualized Spreadsheet Grid & Record Detail modal
│   ├── dashboard/    # Forms Dashboard & template lifecycle management
│   ├── entry/        # Rapid Data Entry stepper & signature widget
│   ├── help/         # Interactive Knowledge Base & Help tab
│   ├── import/       # Data Consolidator & database backup manager
│   └── layout/       # App Shell navbar & mobile drawer layout
└── App.tsx           # Route state & React.lazy code splitting
```

---

## 📜 License & Attribution

Distributed under the **MIT License**. Created by [Deekshith Vodela](https://linktr.ee/deekshithvodela).

Copyright (c) 2026 Deekshith Vodela. All rights reserved.
