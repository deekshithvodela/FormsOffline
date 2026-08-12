import React, { useState } from 'react';
import { HelpCircle, Search, Sparkles, Folder, PenTool, Database, Combine, CheckCircle, Code, BookOpen, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface HelpModule {
  id: string;
  stepNum: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  summary: string;
  steps: {
    title: string;
    description: string;
    tip?: string;
  }[];
}

export const HelpTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['quick-start']));

  const modules: HelpModule[] = [
    {
      id: 'quick-start',
      stepNum: 'Step 1',
      title: 'Quick Start, PWA Installation & Operator Setup',
      category: 'Getting Started',
      icon: <Sparkles size={20} color="var(--primary)" />,
      summary: 'Learn how to install Forms Offline as a PWA, set up your operator alias, and manage dark mode.',
      steps: [
        {
          title: '1. Accessing the Application',
          description: 'Open Forms Offline in any modern web browser (Chrome, Edge, Firefox, Safari, or Brave) or launch the application directly from your desktop or home screen.'
        },
        {
          title: '2. Installing as a Desktop / Mobile PWA',
          description: 'On Chrome or Edge, click the Install icon (computer with down arrow) in the right side of the address bar. On mobile devices, tap browser Menu -> "Add to Home Screen". Once installed, Forms Offline launches instantly from your desktop or app drawer with 100% zero-network dependency!',
          tip: 'Pro Tip: PWA installation caches all web assets locally so the app works seamlessly during total internet outages or in remote field locations.'
        },
        {
          title: '3. Setting Up Your Operator Profile Alias',
          description: 'Click the Profile icon in the top header bar to open the Operator Profile modal. Enter your name or ID (e.g., "Operator 1", "Field Inspector #14"). This alias is automatically stamped into all local submission provenance logs and CSV/Excel exports.',
          tip: 'Your operator alias and persistent device identifier guarantee complete audit accountability during team data consolidation.'
        },
        {
          title: '4. Light & Dark Mode Customization',
          description: 'Click the Sun / Moon toggle icon in the top header to switch between Dark Slate and Clean Light themes. Your preference is remembered automatically.'
        }
      ]
    },
    {
      id: 'google-forms',
      stepNum: 'Step 2',
      title: 'Importing Google Forms & Microsoft Forms',
      category: 'Form Importer',
      icon: <Code size={20} color="var(--accent-green)" />,
      summary: 'Convert live Google Forms and Microsoft Forms links or page source HTML into 100% offline form templates.',
      steps: [
        {
          title: 'Option A: 1-Click Link Import (Recommended)',
          description: 'In the Forms Dashboard toolbar, click "Import" -> "Import Google / MS Link" (Sparkles icon). Paste any public form URL (supports /viewform, /edit, /formResponse, or short URLs like forms.gle/...) and click "Convert & Create Offline Form".',
          tip: 'The importer parses all form questions, section breaks (Page 1 of N), radio choices, checkbox lists, scale bounds, and text inputs automatically.'
        },
        {
          title: 'Option B: Offline Page Source / HTML Fallback',
          description: 'If you are in a completely offline environment without internet connectivity, open the saved Google Form HTML page in your browser, press Ctrl+U (View Page Source), copy all text (Ctrl+A -> Ctrl+C), switch to the "Page Source / HTML" tab inside Forms Offline, and paste the raw HTML string.',
          tip: 'This fallback uses regex DOM parsing to extract questions locally without hitting any external servers.'
        }
      ]
    },
    {
      id: 'dashboard',
      stepNum: 'Step 3',
      title: 'Forms Dashboard & Template Lifecycle Management',
      category: 'Dashboard',
      icon: <Folder size={20} color="var(--accent-blue)" />,
      summary: 'Manage offline form templates, launch data collection, duplicate forms, and export template files.',
      steps: [
        {
          title: '1. Launching Data Entry',
          description: 'Click the blue "Collect Data" button on any template card to open the Rapid Entry stepper and begin capturing field responses.'
        },
        {
          title: '2. Viewing Response Datasets',
          description: 'Click "View Records (N)" on a template card to navigate directly to the virtualized Dataset CMS grid pre-filtered for that form.'
        },
        {
          title: '3. Duplicate & Remix (Safe Form Copying)',
          description: 'Click the "•••" (More Actions) menu on a template card and select "Duplicate & Remix". This creates a fresh editable copy of the form template without altering active schema records.',
          tip: 'Always use Duplicate & Remix if you need to create a modified variation of an existing form while preserving older dataset records.'
        },
        {
          title: '4. Exporting & Importing Template Packages',
          description: 'Select "Export Template (.formsoffline)" from the "•••" menu to save a shareable template package. Anyone can import this file via "Import" -> "Import Template File" on another device.'
        }
      ]
    },
    {
      id: 'builder',
      stepNum: 'Step 4',
      title: 'Form Authoring, Question Widgets & Option Branching',
      category: 'Form Builder',
      icon: <PenTool size={20} color="var(--accent-purple)" />,
      summary: 'Create multi-section forms, configure logic branching rules, and set up advanced question widgets.',
      steps: [
        {
          title: '1. Creating & Reordering Sections',
          description: 'Click "+ Add Section" at the bottom of the canvas to create section breaks. Click "Reorder Sections" in the top builder toolbar to drag and reorder sections with automatic "Section X of N" visual grouping.'
        },
        {
          title: '2. Question Types & Widgets',
          description: 'Forms Offline supports 14 question types: Text, Textarea, Number, Select Dropdown, Radio, Checkbox, Date, Time, Location/Region, Digital Signature Canvas, Linear Scale (0–10), Rating Stars, Image Cards, and Title Blocks.'
        },
        {
          title: '3. Option-Based Logic Branching',
          description: 'For Radio and Select questions, enable "Option Branching" in the card settings. Select a target section for specific answer choices (e.g., Choice A -> "Go to Section 3", Choice B -> "Submit Form").'
        },
        {
          title: '4. Reset Canvas & Form Settings',
          description: 'Click "Reset" in the builder toolbar to clear the canvas back to a clean state. Click "Settings" to toggle End-to-End Encryption (E2EE), Progress Bar, Draft Recovery, or custom Confirmation Messages.'
        }
      ]
    },
    {
      id: 'entry',
      stepNum: 'Step 5',
      title: 'Rapid Field Data Entry & Debounced Autosave',
      category: 'Data Entry',
      icon: <CheckCircle size={20} color="var(--accent-amber)" />,
      summary: 'Capture responses with instant keyboard navigation, automatic draft recovery, and digital signature drawing.',
      steps: [
        {
          title: '1. Navigating Stepper Sections',
          description: 'Use the "Next Section" and "Previous" buttons or press Tab to fill out questions. Progress bar indicators reflect your completion percentage in real time.'
        },
        {
          title: '2. Drawing Digital Signatures',
          description: 'For signature questions, draw directly inside the touch-enabled canvas widget using a mouse, stylus, or finger. Click "Clear" to redraw if needed.'
        },
        {
          title: '3. 300ms Debounced Autosave & Draft Recovery',
          description: 'Every keystroke is saved automatically after 300ms of inactivity into local IndexedDB storage (sub_[templateId]_draft). If your browser or device restarts, your responses are automatically restored!',
          tip: 'Manual Save: You can also press Ctrl+S at any time to trigger an instant draft save.'
        },
        {
          title: '4. Final Submission & Draft Purging',
          description: 'Clicking "Submit Record" validates required fields, stamps operator provenance, saves the final completed submission, and automatically purges the temporary draft.'
        }
      ]
    },
    {
      id: 'cms',
      stepNum: 'Step 6',
      title: 'Dataset CMS, Record Editing & Virtualized Spreadsheet',
      category: 'Dataset CMS',
      icon: <Database size={20} color="var(--accent-green)" />,
      summary: 'Inspect captured records, edit submission values, audit cryptographic signatures, and manage spreadsheet data.',
      steps: [
        {
          title: '1. High-Performance Virtualized Table Grid',
          description: 'The Dataset CMS uses virtualized rendering (@tanstack/react-virtual) to display thousands of records with zero lag. Headers and rows feature strict min-width protection so text never squishes or truncates.'
        },
        {
          title: '2. Editing Submission Entries',
          description: 'Click the "Edit Entry" button (Pencil icon) in any submission row to open the inline record editor. Modify responses and click "Save Changes". Edits are recorded silently in the cryptographic version history.'
        },
        {
          title: '3. Inspecting Record Provenance',
          description: 'Click the "Record Detail & Audit Log" button (Info icon) to view full audit logs, ISO timestamps, operator attribution, and SHA-256 payload signatures.'
        },
        {
          title: '4. Single & Bulk Record Deletions',
          description: 'Click the Trash icon on a row to delete an individual record, or check the header box to select multiple records and click "Delete (N)" for batch purge with confirmation.'
        }
      ]
    },
    {
      id: 'consolidator',
      stepNum: 'Step 7',
      title: 'Data Consolidator & Cross-Device Union Merging',
      category: 'Data Consolidation',
      icon: <Combine size={20} color="var(--primary)" />,
      summary: 'Merge response packages (.formdata) collected across multiple offline devices without data loss or duplicates.',
      steps: [
        {
          title: '1. Collecting Response Packages from Field Devices',
          description: 'On field devices, export response packages by clicking "Share / Export" -> "Export Response Package (.formdata)" in Dataset CMS or Dashboard. Transfer files via USB, Bluetooth, or SD card.'
        },
        {
          title: '2. Merging Packages into Master Storage',
          description: 'Go to the "Data Consolidator" tab and upload the .formdata package files. The consolidation engine compares SHA-256 fingerprints, performs union deduplication, and merges new records seamlessly.'
        },
        {
          title: '3. Resolving Field Conflicts',
          description: 'If identical record IDs contain conflicting values from different operators, the consolidator presents a side-by-side conflict resolution modal allowing you to pick winning values.'
        },
        {
          title: '4. Full Database Backup & Restore',
          description: 'In Data Consolidator, click "Export Database Backup (.formbackup)" to create a full system snapshot of all templates, submissions, and settings.'
        }
      ]
    },
    {
      id: 'export',
      stepNum: 'Step 8',
      title: 'Data Export Formats, Consolidation Strategy & Multi-Sheet Excel',
      category: 'Exports & Reports',
      icon: <Download size={20} color="var(--accent-blue)" />,
      summary: 'Export clean CSV files, multi-sheet Excel workbooks with version audit logs, raw JSON packages, and self-contained ZIP packages.',
      steps: [
        {
          title: '1. Strategy: Forms WITHOUT Files vs Forms WITH Files',
          description: 'For forms WITHOUT file uploads, the .formdata JSON package is optimal for fast, light cross-device transfer. For forms WITH file attachments (images, PDFs, signatures), export a Portable ZIP Package (.zip), which bundles Responses.xlsx with an attachments/ folder for both human inspection and direct import into Data Consolidator.',
          tip: 'Data Consolidator seamlessly ingests both .formdata JSON packages and .zip archives!'
        },
        {
          title: '2. Standard CSV Export (.csv)',
          description: 'In Dataset CMS, click "Share / Export" -> "Export CSV (.csv)". Generates a standard CSV spreadsheet with "Submitted At (UTC)" strictly formatted as Column 1.'
        },
        {
          title: '3. Multi-Sheet Excel Workbook (.xlsx)',
          description: 'Click "Share / Export" -> "Export Excel (.xlsx)". Generates a 2-sheet Excel file: Sheet 1 ("Submissions") contains clean response data; Sheet 2 ("Version Audit Log") contains full audit trails of creation and edit timestamps.',
          tip: 'Code Splitting: SheetJS is lazy-loaded on demand to ensure lightning-fast initial app load times under 200KB.'
        },
        {
          title: '4. Response Package (.formdata) & Portable ZIP (.zip)',
          description: '.formdata exports human-readable JSON payloads formatted for multi-device union merging. Portable ZIP packages bundle Excel sheets with relative file attachments for complete offline portability.'
        }
      ]
    },
    {
      id: 'faq',
      stepNum: 'FAQ',
      title: 'Frequently Asked Questions (FAQ)',
      category: 'General FAQ',
      icon: <BookOpen size={20} color="var(--accent-rose)" />,
      summary: 'Answers to common questions regarding offline storage, privacy, limits, and browser support.',
      steps: [
        {
          title: 'Q: Is any data sent to external servers or cloud services?',
          description: 'No. Forms Offline operates 100% client-side with zero telemetry, zero analytics tracking, and zero cloud backends. All data stays strictly inside your local browser IndexedDB storage.'
        },
        {
          title: 'Q: How many records can Forms Offline store?',
          description: 'Forms Offline can store tens of thousands of submissions, limited only by your browser\'s local disk quota (typically 5GB to 50GB+ depending on your hard drive space).'
        },
        {
          title: 'Q: What happens if I clear my browser history / site data?',
          description: 'Clearing browser site data will erase IndexedDB storage! Always export regular backups by going to Data Consolidator -> "Export Database Backup (.formbackup)" or exporting CSV/Excel files.'
        },
        {
          title: 'Q: Does Google / MS Form link importing require an active internet connection?',
          description: 'The 1-Click Link Importer requires internet access once to fetch the form HTML structure. Once imported, the form is stored permanently offline in your local database for zero-network data collection!'
        }
      ]
    }
  ];

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(modules.map((m) => m.id)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const filteredModules = modules.filter((m) => {
    const q = searchQuery.toLowerCase();
    if (m.title.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
      return true;
    }
    return m.steps.some((s) => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  });

  return (
    <div className="help-container">
      {/* Header Banner */}
      <div className="card help-header-card">
        <div className="help-header-flex">
          <div className="help-header-title-group">
            <HelpCircle size={32} color="var(--primary)" />
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Help & Knowledge Base</h1>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Step-by-step documentation for offline form building, link importing, rapid data entry, CMS management, and consolidation
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline btn-sm" onClick={handleExpandAll}>
              <ChevronDown size={14} /> Expand All
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleCollapseAll}>
              <ChevronUp size={14} /> Collapse All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="help-search-wrapper">
          <Search size={18} className="help-search-icon" />
          <input
            type="text"
            placeholder="Search help topics (e.g. Google Forms, PWA, Autosave, Multi-Sheet Excel)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="help-search-input"
          />
        </div>
      </div>

      {/* Accordion List */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredModules.map((mod) => {
          const isExpanded = expandedIds.has(mod.id);

          return (
            <div
              key={mod.id}
              className="card help-accordion-card"
              style={{
                borderLeft: `4px solid ${isExpanded ? 'var(--primary)' : 'transparent'}`
              }}
            >
              {/* Accordion Header Button */}
              <button
                onClick={() => toggleExpand(mod.id)}
                className="help-accordion-header"
                style={{
                  background: isExpanded ? 'rgba(99,102,241,0.06)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {mod.icon}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                        {mod.stepNum}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {mod.category}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {mod.title}
                    </h2>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isExpanded ? 'var(--primary)' : 'var(--bg-input)',
                    color: isExpanded ? '#ffffff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Accordion Expanded Body */}
              {isExpanded && (
                <div className="help-accordion-body">
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                    {mod.summary}
                  </p>

                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {mod.steps.map((st, sIdx) => (
                      <div
                        key={sIdx}
                        className="help-step-box"
                      >
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                          {st.title}
                        </h3>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                          {st.description}
                        </p>
                        {st.tip && (
                          <div className="help-tip-box">
                            <Sparkles size={14} />
                            <span>{st.tip}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredModules.length === 0 && (
          <div className="card empty-state-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <BookOpen size={42} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>No Help Topics Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No documentation topics matched your search query "{searchQuery}". Try searching for terms like "Google", "PWA", "Autosave", or "Excel".
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
