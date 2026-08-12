# Forms Offline — Consolidated Execution Plan

## 1. Product Overview

**Display name:** Forms Offline  
**Technical/project identifier:** `forms-offline`

Forms Offline is an **offline-first, privacy-preserving form digitization and data management application**.

It is designed for users who have information on physical paper forms and need to convert those records into structured digital datasets without relying on a backend or cloud service.

### Core workflow

```text
Physical Paper Form
        ↓
Create Form Template
        ↓
Digitally enter paper records
        ↓
Local Database
        ↓
 ┌───────────────┬───────────────┐
 ↓               ↓               ↓
JSON            CSV             XLSX
 ↓
In-App CMS / Spreadsheet Interface
 ↓
Review / Edit / Filter / Relink / Merge
```

The application must support:

- PWA
- Android
- iOS
- completely offline operation
- local data storage
- no mandatory authentication
- no cloud backend
- no telemetry
- no server-side processing
- form templates
- data-entry forms
- spreadsheet/table CMS
- form ↔ dataset relationships
- dataset merging
- template sharing
- conflict detection
- provenance tracking
- JSON export
- CSV export
- XLSX export
- import and backup/restore

The architecture must remain scalable enough that optional synchronization or cloud functionality could be added in the future without rewriting the core.

---

# 2. Product Philosophy

Forms Offline is **not an online survey SaaS**.

Its purpose is:

> Physical forms → local digital entry → structured local dataset → export/merge.

The product should feel like:

> **Google Forms + Excel + local database + Git-like dataset merging — without the cloud.**

Primary use cases include:

- digitizing paper forms
- field data entry
- offline environments
- teams independently entering the same paper form
- later consolidating datasets
- maintaining provenance
- producing Excel/CSV/JSON datasets
- keeping sensitive data under local user control

---

# 3. Core Architectural Principles

Forms Offline must be:

- local-first
- offline-first
- portable
- deterministic
- mergeable
- lightweight
- privacy-preserving
- data-integrity focused

The application must never require internet connectivity for core functionality.

```text
                 FORMS OFFLINE CORE
                        │
             ┌──────────┴──────────┐
             │                     │
       Form Engine             Data Engine
             │                     │
       Template Model        Record Model
             │                     │
             └──────────┬──────────┘
                        │
                 Local Storage
                        │
          ┌─────────────┼─────────────┐
          ↓             ↓             ↓
         PWA         Android         iOS
       Browser      Capacitor       Capacitor
```

Use a **web-first shared codebase**.

Recommended stack:

- TypeScript
- React
- Vite
- PWA support
- Capacitor for Android/iOS
- IndexedDB for browser persistence
- Dexie or an equivalent lightweight IndexedDB abstraction
- Web Workers where profiling justifies them
- XLSX library loaded lazily
- JSON as canonical interchange format
- CSV export
- GitHub Actions for CI/CD

Do not create separate business logic for Android, iOS and PWA.

---

# 4. Display Name and Naming

User-facing name:

**Forms Offline**

Technical identifier may be:

```text
forms-offline
```

Do not display `Formsoffline` in the UI.

Potential package/bundle identifier:

```text
com.formsoffline.app
```

Keep technical identifiers centralized in configuration rather than hard-coded throughout the project.

---

# 5. Offline and Privacy Requirements

The application must work with network access completely disabled after installation/assets are available.

Do not introduce:

- Firebase
- Supabase
- PostgreSQL
- MongoDB
- authentication servers
- REST APIs
- GraphQL servers
- cloud databases
- analytics SDKs
- advertising SDKs
- telemetry
- unnecessary network requests

The application must not depend on:

```text
POST /submit
GET /forms
GET /datasets
```

or any similar backend API.

The application itself is the local data-processing environment.

The user should be able to:

```text
Open Forms Offline
      ↓
Disconnect Wi-Fi
      ↓
Create forms
      ↓
Enter records
      ↓
Edit datasets
      ↓
Merge datasets
      ↓
Export files
```

---

# 6. Identity Model

There is intentionally no conventional authentication system.

Instead, each installation creates a local profile identity.

Example:

```text
Profile
├── profileId
├── displayName
├── installationId
├── createdAt
├── updatedAt
└── metadata
```

Generate `profileId` using a UUID/ULID-style identifier.

Generate a separate `installationId`.

Do not use:

- IMEI
- MAC address
- hardware serial number
- advertising ID
- device fingerprinting

as the primary identity mechanism.

The identity must be application-generated and portable.

A user may optionally give the profile a human-readable name.

Example:

```text
Profile name:
Field Team A

Profile ID:
prof_a83f...
```

---

# 7. Provenance

Every record must retain provenance metadata.

Do not mix internal provenance fields into the visible form schema.

Conceptually:

```text
Record
├── recordId
├── templateId
├── datasetId
├── values
└── metadata
    ├── createdAt
    ├── updatedAt
    ├── createdByProfileId
    ├── createdByInstallationId
    ├── sourceRecordId
    └── revision
```

This allows merged datasets to identify:

- who entered the record
- which installation entered it
- when it was entered
- where the record originated

---


The provenance model applies to every submission, not just datasets.

A submission retains its own identity independently of the device that created it. This is what allows multiple devices to use the same template independently and later merge their submissions without row-level conflicts.

# 8. ID Strategy

Every major entity must have a globally unique ID.

Entities include:

```text
Profile
Installation
FormTemplate
FormVersion
Field
Dataset
Record
Submission
Export
Import
MergeOperation
```

Never use row numbers as primary identifiers.

This is invalid:

```text
Row 1
Row 2
Row 3
```

A row can move or be reordered.

A record ID must remain stable.

---

# 9. Form Template System

The form builder should provide the useful functionality expected from Google Forms while remaining offline.

## Initial field types

### Basic

- short text
- long text
- integer
- decimal
- date
- time
- date + time

### Selection

- radio / single choice
- checkbox / multiple choice
- dropdown
- multi-select dropdown

### Advanced

- email
- URL
- phone
- rating
- linear scale
- yes/no
- section
- descriptive/instruction text

The architecture must allow new field types to be added without changing the underlying database model.

Example:

```ts
FieldDefinition {
    id
    type
    key
    label
    description
    required
    defaultValue
    validation
    options
    display
}
```

---

# 10. Form Versioning

Forms must be versioned.

Never blindly mutate historical form definitions.

Example:

```text
Patient Survey
    │
    ├── v1
    ├── v2
    └── v3
```

Every record/submission must reference the exact form version used.

This is necessary for reliable historical interpretation and dataset merging.

---

# 10A. Google Forms-Style Form Architecture

The Form Builder must be architecturally separate from the Dataset CMS.

These are different workflows:

```text
FORM BUILDER
    ↓
Create/edit the structure of a form

DATA ENTRY
    ↓
Use the form to create submissions

DATASET CMS
    ↓
Inspect/edit/manage resulting records
```

The Form Builder should provide a familiar Google Forms-like authoring experience, while the CMS should provide a spreadsheet-like data-management experience.

Do not combine these interfaces into one generic editor.

## 10A.1 Form hierarchy

A form must be modeled as:

```text
FormTemplate
│
├── Settings
├── FormVersions
│
└── Sections
     │
     ├── Section 1
     │    ├── title
     │    ├── description
     │    ├── questions
     │    └── navigation
     │
     ├── Section 2
     │    ├── title
     │    ├── description
     │    ├── questions
     │    └── navigation
     │
     └── Section 3
          ├── title
          ├── description
          ├── questions
          └── navigation
```

A **section is a structural object**, not merely another question type.

This is required for:

- multi-page forms
- progress indicators
- conditional navigation
- section-specific descriptions
- section ordering
- future conditional logic
- form preview

## 10A.2 Form Builder interface

The Form Builder must have a dedicated authoring interface inspired by Google Forms.

Example:

```text
┌─────────────────────────────────────────────┐
│ Forms Offline                    Preview     │
├─────────────────────────────────────────────┤
│                                             │
│ Community Health Survey                    │
│ Survey of household health indicators      │
│                                             │
│ ─────────────────────────────────────────   │
│ Section 1                                  │
│ Basic Information                          │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Name                                    │ │
│ │ Short answer                            │ │
│ │ Required ✓                         ⋮    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Age                                     │ │
│ │ Number                                  │ │
│ │ Required ✓                         ⋮    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│        + Add question                       │
│        + Add section                        │
│                                             │
└─────────────────────────────────────────────┘
```

Support:

- add/edit/delete questions
- add/edit/delete sections
- drag/reorder questions
- drag/reorder sections
- duplicate questions
- duplicate sections
- required/optional questions
- validation
- descriptions
- option management
- preview
- form versioning
- undo/redo
- section navigation configuration

The visual design does not need to clone Google Forms. It should use the familiar conceptual model while retaining Forms Offline's lightweight design.

## 10A.3 Form schema

```text
FormTemplate
├── id
├── title
├── description
├── settings
├── sections[]
└── metadata
```

```text
Section
├── id
├── title
├── description
├── order
├── questions[]
└── navigation
```

```text
Question
├── id
├── key
├── type
├── label
├── description
├── required
├── defaultValue
├── validation
├── options
└── display
```

Question IDs must remain stable within a form version so submissions can reliably reference fields.

## 10A.4 Form settings

Provide a dedicated Form Settings interface.

### Response settings

- allow multiple submissions
- allow incomplete drafts
- allow editing an existing submission
- require completion before finalization
- submission confirmation behavior
- respondent identifier strategy

### Presentation settings

- show progress indicator
- navigation style
- section behavior
- confirmation message

### Data settings

- default dataset
- dataset assignment behavior
- provenance visibility
- timestamp behavior

Settings that affect interpretation of historical submissions must be versioned.

## 10A.5 Sections and navigation

Sections are real form pages/structural units.

Example:

```text
Section 1
    ↓
Section 2
    ↓
Section 3
```

Data entry must support:

- Next
- Back
- progress indication
- section titles
- section descriptions
- resuming incomplete sections

## 10A.6 Conditional section branching

The architecture must support conditional navigation.

Example:

```text
Section 1
"Are you diabetic?"

       ↓

    Yes ─────────→ Section 3: Diabetes
       │
       No
       ↓
Section 2: General Health
```

Navigation must be schema-driven.

Conceptually:

```text
NavigationRule
├── condition
├── sourceQuestionId
├── operator
├── value
└── destinationSectionId
```

Examples:

```text
If answer == "Yes"
    → Section 3

If answer == "No"
    → Section 2
```

Do not hard-code branching into individual UI components.

## 10A.7 Preview mode

The Form Builder must provide a preview mode that renders the form as a respondent/data-entry user would see it.

Preview must allow testing:

- required fields
- validation
- section navigation
- branching
- options
- progress
- confirmation behavior

Preview must never create real production submissions.

## 10A.8 Form Builder vs CMS

These interfaces must remain separate.

### Form Builder

Defines:

- sections
- questions
- validation
- branching
- settings
- versions
- preview

### Dataset CMS

Manages:

- rows
- columns
- editing
- filtering
- sorting
- searching
- provenance
- merging
- exports

The CMS must not become the form builder.

---

# 10B. Multiple Submissions Architecture

Multiple submissions of the same form are the normal operating mode of Forms Offline.

The architecture must explicitly distinguish:

```text
FORM TEMPLATE
    ↓
FORM VERSION
    ↓
DATASET
    ↓
SUBMISSIONS
```

The form defines the schema.

A submission is one independent instance of that schema.

## 10B.1 One form → unlimited submissions

Example:

```text
Community Health Survey v1
        │
        └── Dataset: Village A
               │
               ├── Submission S001
               ├── Submission S002
               ├── Submission S003
               ├── Submission S004
               └── ...
```

Creating another submission must never modify the form template.

Each submission is an independent record.

## 10B.2 Submission identity

Every submission must receive a globally unique `submissionId` at creation time.

Prefer UUIDv7/ULID-style identifiers.

Conceptually:

```text
Submission
├── submissionId
├── templateId
├── templateVersionId
├── datasetId
├── status
├── values
└── metadata
    ├── createdAt
    ├── updatedAt
    ├── createdByProfileId
    ├── createdByInstallationId
    └── revision
```

Never use row number, timestamp alone, device ID alone, or profile ID alone as the submission identity.

## 10B.3 Multiple devices using the same form

This is a primary Forms Offline workflow.

Example:

```text
Same template:
Community Survey v1
templateId = T123
```

Device A:

```text
S001
S002
S003
```

Device B:

```text
S004
S005
S006
```

Device C:

```text
S007
S008
```

When combined:

```text
T123 / v1
    │
    ├── S001
    ├── S002
    ├── S003
    ├── S004
    ├── S005
    ├── S006
    ├── S007
    └── S008
```

This is a normal merge and should produce **zero conflicts**.

The merge engine should treat this primarily as an append/union operation.

## 10B.4 Real submission conflicts

A conflict exists when the same logical submission ID appears in multiple datasets with divergent content.

Example:

```text
Device A:
S001
Age = 31

Device B:
S001
Age = 32
```

The merge engine must report:

```text
CONFLICT
───────────────
Submission: S001
Field: Age

Device A: 31
Device B: 32

[Keep 31]
[Keep 32]
[Inspect]
```

It must never silently choose a value.

## 10B.5 Duplicate submissions vs conflicting submissions

Keep these concepts separate.

### Same submission ID

```text
S001 + S001
```

Potential conflict if contents differ.

### Different submission IDs, identical content

```text
S001
S009
```

These may represent duplicate real-world entries, but they are not technical conflicts.

Do not automatically delete them.

Instead allow:

```text
Possible duplicate
```

with manual review.

## 10B.6 Respondent identity

"Multiple submissions" and "one submission per respondent" are different concepts.

Multiple submissions should normally be allowed.

If duplicate respondents need detection, use an explicit respondent identifier field:

```text
Respondent ID
Patient ID
Household ID
Case Number
```

The system can then warn:

```text
A submission already exists for Respondent ID 12345.
```

Do not use device ID or profile ID as respondent identity.

## 10B.7 Submission lifecycle

Support:

```text
Draft
  ↓
Autosaved
  ↓
Complete
  ↓
Archived (optional)
```

A draft can be resumed later.

A completed submission may be editable if enabled by the form settings.

Edits must update:

```text
updatedAt
updatedByProfileId
updatedByInstallationId
```

The revision field must be available for future full history support.

## 10B.8 Dataset-level concurrency

There is no real-time shared database.

Therefore Forms Offline does not need online locking.

Independent devices create independent submissions locally and later exchange dataset packages.

The merge engine is the synchronization boundary.

This is preferable to simulating real-time collaboration without a backend.

---

# 11. Dataset Architecture

Forms and data must be separate entities.

```text
FormTemplate
      │
      ├── FormVersion
      │
      └── Dataset
              │
              ├── Record
              ├── Record
              └── Record
```

One form may have multiple datasets.

Example:

```text
Form:
Community Health Survey

Datasets:
2026 Village A
2026 Village B
2026 Village C
```

Datasets must support:

- creation
- rename
- archive
- export
- duplicate
- relink to compatible form versions

---

# 12. Form ↔ Dataset Relationships

Datasets must explicitly reference:

```text
templateId
templateVersionId
```

Do not use human-readable names as relationships.

Allow:

> Relink dataset

but perform compatibility validation before relinking.

---

# 13. Schema Compatibility Engine

Before merging or relinking, compare schemas.

Possible results:

```text
COMPATIBLE
PARTIALLY COMPATIBLE
INCOMPATIBLE
```

Compare:

- template ID
- template version
- field IDs
- field types
- required status
- option IDs
- validation rules
- structural sections

The system must never silently merge incompatible schemas.

---

# 14. Template Sharing

There is no server, so template sharing should happen through portable files.

Create a template package:

```text
my-survey.formsoffline
```

Conceptually:

```text
manifest.json
template.json
schema.json
metadata.json
```

The package should contain the form definition, not existing submissions, unless explicitly requested.

Users can share templates through:

- WhatsApp
- email
- USB
- Bluetooth
- local file sharing
- GitHub
- any other file-transfer mechanism

The receiving application imports the template.

---

# 15. Dataset Packages

Create a portable dataset package:

```text
community-health-2026.formdata
```

Conceptually:

```text
manifest.json
template-reference.json
dataset.json
records.json
```

Preserve:

- dataset ID
- template ID
- form version
- record IDs
- provenance
- timestamps
- schema metadata

---

# 16. Merge Engine

Dataset merging is a core subsystem.

Typical workflow:

```text
Device A
   ↓
Export dataset

Device B
   ↓
Export dataset

Device C
   ↓
Export dataset

       ↓

Import files

       ↓

Compatibility check

       ↓

Duplicate detection

       ↓

Conflict detection

       ↓

Merge

       ↓

Unified dataset
```

Never merge based on row position.

---

# 17. Deduplication

Record IDs are the primary identity.

If two datasets contain:

```text
recordId = abc123
```

the merge engine knows they refer to the same logical record.

If two records have different IDs but identical content, do not automatically delete one.

Mark them as:

```text
Possible duplicate
```

and allow manual review.

---

# 18. Conflict Resolution

Example:

```text
Record ID:
abc123

Device A:
Name = John
Age = 31

Device B:
Name = John
Age = 32
```

Do not silently choose a value.

Display:

```text
CONFLICT

Record: abc123
Field: Age

Device A → 31
Device B → 32

[31]
[32]
[Inspect]
```

Initial implementation should support manual conflict resolution.

Future policies may include:

- latest timestamp
- source priority
- profile priority
- field-specific policies

---

# 19. Deterministic Merge

The same inputs with the same merge policy must produce the same result.

Store merge metadata:

```text
mergeOperationId
timestamp
inputDatasetIds
outputDatasetId
conflictPolicy
```

The merge engine must be designed for efficient large datasets.

Avoid O(n²) comparisons.

Use indexed lookups such as:

```text
Map<recordId, record>
```

for normal record matching.

---

# 20. Template Fingerprinting

Create a deterministic template/schema fingerprint.

Conceptually:

```text
templateFingerprint =
SHA-256(canonicalized-template-schema)
```

This helps identify whether two templates are structurally identical even when their files have been moved between devices.

JSON must be canonicalized before hashing so property ordering does not change the fingerprint.

---

# 21. CMS / Spreadsheet Interface

Provide a local spreadsheet-like CMS.

Users should be able to:

- view rows
- edit cells
- add rows
- delete rows
- duplicate rows
- sort
- filter
- search
- hide columns
- reorder columns
- resize columns
- freeze columns
- undo/redo
- inspect provenance
- inspect record history
- export

Use virtualization.

Do not render the entire dataset into the DOM.

The UI must be capable of handling:

```text
10,000+
50,000+
100,000+
```

records.

---

# 22. Data Entry UX

Data entry is the primary workflow.

Optimize it for rapid transcription from paper.

Requirements:

- keyboard friendly
- mobile friendly
- clear required indicators
- next-field navigation
- autosave
- validation
- incomplete record saving
- resume unfinished records
- optional previous-value reuse
- progress indication

Most importantly:

> Never lose entered data because the user accidentally closes or refreshes the application.

---

# 23. Drafts and Autosave

Support:

```text
Draft
 ↓
Autosaved
 ↓
Complete
```

Do not rely solely on a final Submit button.

Persist changes locally as the user works.

Use debounced persistence for normal typing where appropriate, while persisting critical transitions immediately.

Autosave must not introduce visible input lag.

---

# 24. Dataset States

Datasets:

```text
Draft
Active
Archived
```

Records:

```text
Draft
Complete
```

This prevents incomplete entries from being confused with finalized records.

---

# 25. Import

Support:

```text
.formsoffline
.formdata
.formbackup
.json
.csv
.xlsx
```

For CSV/XLSX imports, provide column mapping.

Example:

```text
Imported column       → Form field

Patient Name          → Name
Age                   → Age
Sex                   → Gender
Village               → Village
```

Validate before importing.

Never silently discard columns or records.

---

# 26. Export

JSON is the canonical machine-readable format.

Support:

### JSON

```text
dataset.json
```

### CSV

For interoperability.

### XLSX

For spreadsheet workflows.

Allow users to choose whether to include:

```text
☑ Data
☑ Provenance
☐ Internal IDs
☐ Metadata
```

Human-facing exports should not expose internal IDs by default.

---

# 27. XLSX Performance

XLSX processing can be heavy.

Do not load the XLSX library during normal application startup.

Lazy-load it only when the user chooses XLSX import/export.

Example:

```text
User clicks:
Export XLSX
        ↓
Load XLSX module
        ↓
Generate file
```

Large parsing/generation operations may be moved to a Web Worker where appropriate.

---

# 28. Backup and Restore

Because there is no backend, local backup is essential.

Provide:

> Export Everything

Example:

```text
formsoffline-backup-2026-08-11.formbackup
```

The backup should contain:

```text
profiles
templates
datasets
records
metadata
relationships
```

Also provide:

> Import Backup

Before changing local data, show a preview.

Never overwrite existing data automatically.

---

# 29. Local Storage Architecture

Use an abstraction:

```text
Application
    ↓
Repository layer
    ↓
Local database abstraction
    ↓
IndexedDB / native-compatible storage
```

The UI must never directly manipulate IndexedDB.

Use repositories/services such as:

```text
getRecord()
getRecords()
queryRecords()
insertRecord()
updateRecord()
deleteRecord()
countRecords()
```

This separation keeps the architecture scalable.

---

# 30. Performance Requirements

Forms Offline must run smoothly on:

- potato PCs
- old Windows/Linux machines
- Chromebooks
- low-RAM laptops
- low-power CPUs
- inexpensive Android devices
- older iPhones

The goal is:

> **Instant-feeling UI, low RAM usage, minimal CPU usage and no unnecessary background work.**

---

# 31. No Electron

Do not create an Electron desktop application.

Desktop users should use the PWA:

```text
Browser
    ↓
PWA
```

rather than bundling another Chromium runtime.

---

# 32. Chromebook Support

Chromebooks are a first-class target.

The PWA should work through:

```text
ChromeOS
+
Chrome
+
PWA
```

without requiring:

- Linux containers
- Android subsystem
- browser extensions
- special permissions
- cloud services

Ideal workflow:

```text
Open Forms Offline
      ↓
Install PWA
      ↓
Disconnect Wi-Fi
      ↓
Continue working
```

---

# 33. PWA Requirements

The PWA must:

- install from the browser
- work offline after initial installation
- cache application assets
- load without network
- maintain local database
- support imports
- support exports
- support sharing files
- provide the same core features as mobile applications

PWA should not be a reduced "lite" version.

Target:

```text
PWA ≈ Android ≈ iOS
```

with platform differences only where unavoidable.

---

# 34. Lightweight Bundle

Maintain explicit performance budgets.

Monitor:

- initial JavaScript
- CSS
- fonts
- images
- third-party libraries
- service worker size

Use code splitting/lazy loading.

Initial bundle should contain only essential functionality.

Potentially lazy-load:

- XLSX import/export
- advanced form builder features
- merge tools
- advanced CMS utilities

---

# 35. React Performance

Avoid unnecessary global state and re-renders.

Do not keep huge datasets in React state.

Avoid:

```ts
const [allRecords, setAllRecords] = useState(...)
```

for large datasets.

Prefer:

```text
UI
 ↓
Query layer
 ↓
IndexedDB
```

Only load records needed for the visible UI.

---

# 36. Virtualized Tables

Never render:

```text
100,000 rows × 30 columns
```

as DOM elements.

Use a virtualized table:

```text
Database
   ↓
100,000 records

   ↓

Virtualized table

   ↓

Only visible rows + small buffer
```

---

# 37. Memory Management

Avoid unnecessary copies of large datasets.

Bad:

```text
IndexedDB
   ↓
Entire dataset
   ↓
Deep clone
   ↓
React state
   ↓
Filtered copy
   ↓
Sorted copy
```

Prefer:

```text
IndexedDB
   ↓
Indexed query
   ↓
Visible records
   ↓
Virtualized UI
```

---

# 38. Web Workers

Use Web Workers where profiling shows that operations would otherwise block the UI.

Good candidates:

- XLSX generation
- XLSX parsing
- large CSV parsing
- large JSON parsing
- dataset merge
- duplicate detection
- schema comparison
- checksums

Do not use workers for every operation.

---

# 39. Large Dataset Targets

Test:

```text
1,000 records
10,000 records
50,000 records
100,000 records
```

Measure:

- startup
- dataset opening
- search
- filtering
- sorting
- editing
- export
- import
- merge

The application must remain usable at large dataset sizes.

---

# 40. UI Design Philosophy

Forms Offline should feel like a lightweight utility rather than a heavy SaaS dashboard.

Prioritize:

- speed
- clarity
- density
- predictability
- accessibility

Avoid:

- unnecessary animations
- video backgrounds
- large decorative images
- particle effects
- excessive blur
- expensive visual effects
- unnecessary shadows
- continuous animations

Respect:

```text
prefers-reduced-motion
```

Prefer system fonts such as:

```text
system-ui
```

where appropriate.

---

# 41. File System Abstraction

Create:

```text
FileService
```

with platform implementations:

```text
WebFileService
AndroidFileService
IOSFileService
```

The UI and business logic should not contain platform-specific file handling.

Native plugins should only be introduced when genuinely required.

---

# 42. Schema Versioning

All stored/exported structures require a schema version.

Example:

```text
schemaVersion: 1
```

Implement migration functions:

```text
v1 → v2
v2 → v3
```

Do not change database structures without migration support.

---

# 43. Data Integrity

Every portable package should contain:

```text
schemaVersion
applicationVersion
templateId
templateVersion
createdAt
checksum
```

Validate checksums during import.

Reject corrupted packages rather than silently importing partial data.

---

# 44. Security

MVP should not introduce unnecessary encryption complexity.

However, storage must be abstracted so encrypted local storage can be introduced later.

Future architecture:

```text
Local database
     ↓
Optional encryption layer
     ↓
Device storage
```

Do not implement custom cryptography.

---

# 45. Testing Strategy

Testing is mandatory because this is a data-integrity application.

## Unit tests

- ID generation
- schema validation
- template fingerprinting
- record validation
- deduplication
- merge
- conflict detection
- import
- export
- migrations

## Integration tests

```text
Create template
 ↓
Create dataset
 ↓
Enter records
 ↓
Export
 ↓
Import
 ↓
Verify identical data
```

## Merge tests

```text
Device A dataset
Device B dataset
 ↓
Merge
 ↓
Verify records
 ↓
Verify provenance
 ↓
Verify duplicates
 ↓
Verify conflicts
```

## PWA tests

- offline launch
- offline reload
- database persistence
- import/export
- large dataset

## Mobile tests

- Android
- iOS
- app restart
- background/foreground
- file sharing
- import/export

---

# 46. Performance Regression Testing

Create benchmarks covering:

```text
Startup
Form rendering
Form navigation
Data entry
Database writes
Dataset loading
Search
Filtering
Sorting
XLSX export
JSON export
CSV export
Import
Merge
```

Maintain benchmark results between releases.

The purpose is to catch regressions such as:

```text
Version 0.4:
100K records → smooth

Version 0.5:
100K records → freezes
```

---

# 47. Repository Structure

Use a structure approximately like:

```text
forms-offline/
│
├── apps/
│   ├── web/
│   └── mobile/
│
├── packages/
│   ├── core/
│   │   ├── models/
│   │   ├── validation/
│   │   ├── merge/
│   │   ├── fingerprint/
│   │   ├── migrations/
│   │   └── services/
│   │
│   ├── database/
│   ├── forms/
│   ├── exports/
│   ├── imports/
│   ├── ui/
│   └── file-system/
│
├── capacitor/
│   ├── android/
│   └── ios/
│
├── tests/
├── docs/
├── scripts/
└── .github/
    └── workflows/
```

The exact monorepo structure may be adjusted to the selected tooling, but the separation of concerns must remain.

---

# 48. GitHub Repository

Include:

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CHANGELOG.md
docs/
```

README should explain:

- what Forms Offline is
- privacy model
- offline architecture
- PWA installation
- Android installation
- future iOS distribution
- importing/exporting
- merging
- template sharing
- development

---

# 49. GitHub Releases

Use GitHub Releases as the primary public repository for release artifacts.

Example:

```text
v0.1.0

Assets:
Forms-Offline-Android-v0.1.0.apk
Forms-Offline-source-v0.1.0.zip
```

The PWA landing page should contain:

```text
Forms Offline

[Use in Browser]

[Download Android APK]

[iOS — Coming Soon]
```

Android APKs can be attached directly to GitHub Releases.

Do not claim that a GitHub-hosted IPA is equivalent to an APK.

---

# 50. Future iOS Shipping Plan

iOS must be planned from the beginning, but **public iOS distribution does not need to block the MVP**.

The codebase should use Capacitor so the same web application can eventually be packaged as an iOS application.

## Phase A — iOS-ready architecture

During initial development:

- keep business logic platform-neutral
- avoid Android-specific assumptions
- create the shared `FileService`
- create platform abstraction layers
- test PWA behavior on Safari
- avoid browser APIs unavailable on iOS
- keep touch interactions first-class
- ensure local persistence works in iOS Safari
- keep the application compatible with WebKit limitations

The goal is:

```text
Shared Forms Offline Core
        │
        ├── PWA / Safari
        ├── Android / Capacitor
        └── iOS / Capacitor
```

## Phase B — Create iOS Capacitor project

When the application is stable:

```text
Web application
      ↓
Capacitor
      ↓
iOS project
      ↓
Xcode
```

Configure:

- Bundle ID
- app icon
- splash screen
- display name
- permissions
- file handling
- sharing
- local storage
- native integrations

Keep native code minimal.

## Phase C — Apple Developer setup

For public iOS distribution, establish the required Apple Developer account and App Store Connect setup.

Create:

- Apple Developer membership
- App ID / Bundle ID
- signing certificates/profiles as required
- App Store Connect application
- app metadata
- privacy disclosures
- screenshots
- age rating
- support URL
- privacy policy URL if required

## Phase D — TestFlight

Before public release:

```text
Build
 ↓
Sign
 ↓
Upload to App Store Connect
 ↓
Internal testing
 ↓
External TestFlight testing
 ↓
Bug fixing
```

Test specifically:

- offline launch
- offline data entry
- app termination/relaunch
- large datasets
- file import
- file export
- iOS share sheet
- Files app integration
- background/foreground transitions
- storage persistence
- memory pressure

## Phase E — App Store release

Once testing is stable:

```text
Release Candidate
       ↓
App Store Connect
       ↓
App Review
       ↓
Public App Store release
```

The website should then change:

```text
[iOS — Coming Soon]
```

to:

```text
[Download on the App Store]
```

## Phase F — Future iOS distribution alternatives

Depending on the intended audience, consider Apple's supported distribution mechanisms as appropriate:

- App Store — public general distribution
- TestFlight — beta testing
- Ad Hoc — controlled distribution to registered devices
- other Apple-supported organization/private distribution options where applicable

Do not build the product around direct IPA downloads as the public iOS installation mechanism.

## Important constraint

Do not delay the PWA/Android MVP waiting for the App Store.

The product architecture should be iOS-ready from day one, while the actual iOS release can happen later.

---

# 51. CI/CD

Eventually use GitHub Actions for:

```text
push
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build PWA
 ↓
build Android
 ↓
build iOS where the signing/build environment permits
 ↓
release artifacts
```

Do not make full release automation the first implementation task.

Stabilize the application first.

---

# 52. PWA Deployment

Deploy the PWA as a static application.

GitHub Pages is a suitable initial option.

The deployed PWA must remain functional without a backend.

````md
# 52A. GitHub Pages Deployment Architecture

GitHub Pages is the initial production hosting target for the Forms Offline PWA.

GitHub Pages must be treated strictly as a **static application hosting layer**, not as a backend or data-storage service.

## 52A.1 Deployment architecture

```text
                    GitHub Repository
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
        Source Code    GitHub Pages   Releases
                           │            │
                           ↓            ├── Android APK
                    Forms Offline PWA   └── Source archives
                           │
                           ↓
                    User's Browser
                           │
                    ┌──────┴──────┐
                    ↓             ↓
                 PWA UI       Local Database
                               │
                         ┌─────┼─────┐
                         ↓     ↓     ↓
                       Forms  Data  Profile
````

GitHub Pages only serves the application assets.

User data must remain local.

## 52A.2 No backend dependency

The PWA must not depend on GitHub Pages or any remote service for:

* creating forms
* editing forms
* storing submissions
* viewing datasets
* editing datasets
* importing data
* exporting data
* merging datasets
* conflict resolution
* template creation
* template import

There must be no application API hosted behind the GitHub Pages deployment.

The application must not introduce:

```text
POST /submit
GET /forms
GET /datasets
PUT /records
DELETE /records
```

or equivalent backend operations.

## 52A.3 Local data architecture

The deployed application should follow:

```text
GitHub Pages
     │
     │ serves static application
     ↓
User's browser
     │
     ↓
Forms Offline application
     │
     ↓
IndexedDB / local storage layer
     │
     ├── Profiles
     ├── Form Templates
     ├── Form Versions
     ├── Datasets
     ├── Submissions
     ├── Drafts
     └── Application metadata
```

A user's data must not become visible to another user merely because both users access the same GitHub Pages URL.

For example:

```text
User A
    ↓
github.io/forms-offline
    ↓
User A's local database

User B
    ↓
github.io/forms-offline
    ↓
User B's local database
```

These are independent local data stores.

## 52A.4 PWA offline requirement

The GitHub Pages deployment must use a service worker and appropriate caching strategy so that the application can continue operating after network connectivity is lost.

The agent must explicitly test:

```text
First visit
    ↓
Application assets cached
    ↓
Install PWA
    ↓
Disable network
    ↓
Reload
    ↓
Application starts
    ↓
Create/open forms
    ↓
Enter data
    ↓
Edit datasets
    ↓
Import/export
    ↓
Merge datasets
```

The application must not assume that "deployed to GitHub Pages" automatically means "offline capable."

Offline behavior must be deliberately implemented and tested.

## 52A.5 Static hosting constraints

The PWA must be compatible with GitHub Pages' static hosting model.

Do not rely on server-side:

* routing
* redirects
* API endpoints
* dynamic rendering
* server-side sessions
* server-side file processing

Client-side routing must be configured so direct navigation to application routes works correctly under the GitHub Pages deployment path.

The base path must be configurable rather than hard-coded.

Example:

```text
https://USERNAME.github.io/forms-offline/
```

The application must correctly resolve routes such as:

```text
/forms
/forms/new
/datasets
/settings
```

within the GitHub Pages base path.

## 52A.6 GitHub Pages and privacy

The GitHub Pages deployment must not transmit user-entered form data to the repository or hosting service.

Do not implement:

* telemetry
* analytics
* advertising
* remote logging
* automatic cloud backups
* remote form submissions

unless explicitly introduced as an optional future feature.

The product's privacy model should remain:

> The application is hosted on GitHub Pages, but the user's form and submission data stays on the user's device unless the user explicitly exports or shares it.

## 52A.7 Development and production environments

Maintain separate configurations for:

```text
Development
Production
```

The production build must not accidentally point to development services.

Since the initial architecture has no backend, production should ideally have no application API URL at all.

## 52A.8 Deployment automation

Use GitHub Actions to build and deploy the PWA.

Recommended flow:

```text
Push to main
     ↓
Install dependencies
     ↓
Lint
     ↓
Typecheck
     ↓
Unit tests
     ↓
Build PWA
     ↓
Verify service worker
     ↓
Deploy static build
     ↓
GitHub Pages
```

A deployment should fail if:

* typechecking fails
* tests fail
* production build fails
* service worker generation fails
* required PWA assets are missing

## 52A.9 PWA installation links

The public landing page should provide:

```text
Forms Offline

[Use in Browser]

[Install PWA]
```

Where browser support allows installation, the application should expose the appropriate PWA installation experience.

The landing page should also provide links to:

```text
[Download Android APK]
[iOS — Coming Soon]
```

The Android link should point to the appropriate GitHub Release asset.

When the iOS App Store release becomes available, replace the placeholder with:

```text
[Download on the App Store]
```

## 52A.10 GitHub Pages is not the data-sharing mechanism

GitHub Pages must not be used as a mechanism for sharing datasets between users.

Team data exchange should continue to use explicit portable files:

```text
Template
    ↓
.formsoffline

Dataset
    ↓
.formdata

Full backup
    ↓
.formbackup
```

Users can transfer these files through:

* USB
* local file sharing
* WhatsApp
* email
* Bluetooth
* cloud drives
* GitHub
* any other mechanism they choose

Forms Offline only processes the files locally.

## 52A.11 Future backend compatibility

The architecture must preserve the possibility of an optional future synchronization service.

Current:

```text
                 Forms Offline
                      │
                Local Database
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
         PWA        Android       iOS
```

Possible future:

```text
                 Forms Offline
                      │
                Local Database
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
         PWA        Android       iOS
          │           │           │
          └───────────┼───────────┘
                      ↓
               Optional Sync
                      ↓
                Remote Service
```

The optional future backend must never be required for the core offline workflow.

The local-first architecture remains the default.

## 52A.12 Deployment definition of done

GitHub Pages deployment is considered complete when:

1. The PWA builds successfully as a static application.
2. The PWA is accessible through the GitHub Pages URL.
3. The PWA can be installed where supported.
4. The application works after network connectivity is disabled.
5. Local forms persist across application restarts.
6. Local submissions persist across application restarts.
7. Import/export works offline.
8. Dataset merging works offline.
9. No user data is sent to a backend.
10. No authentication is required.
11. No telemetry or analytics are required.
12. Android release links can be provided from the same project.
13. The deployment is automated through GitHub Actions.

```
```


---

# 53. MVP Scope

## Phase 1 — Core

Implement:

- project setup
- local database
- profile/installation identity
- form schema
- sections and section navigation
- basic field types
- dedicated form builder
- form settings
- form preview
- conditional branching foundation
- form versions
- submission engine
- independent submission IDs
- data entry
- drafts
- autosave
- datasets
- JSON export
- CSV export
- basic XLSX export
- PWA
- offline operation

## Phase 2 — Data Management

Implement:

- spreadsheet CMS
- search
- filters
- sorting
- editing
- provenance display
- template packages
- dataset packages
- import

## Phase 3 — Team Consolidation

Implement:

- schema fingerprints
- compatibility engine
- merge engine
- deduplication
- conflict detection
- conflict resolution
- merge history

## Phase 4 — Mobile

Implement:

- Capacitor Android
- Android file handling
- Android share integration
- Capacitor iOS
- iOS file handling
- iOS share integration

## Phase 5 — Production

Implement:

- performance optimization
- benchmark suite
- migration system
- extensive testing
- accessibility
- documentation
- CI/CD
- GitHub releases

## Phase 6 — iOS Public Release

Implement:

- Apple Developer setup
- App Store Connect
- TestFlight
- iOS-specific QA
- App Store metadata
- review submission
- public release

---

# 54. First Implementation Sequence

The coding agent should execute in this order:

```text
01. Repository initialization
        ↓
02. Core domain model
        ↓
03. Local database layer
        ↓
04. Profile/installation identity
        ↓
05. Form schema engine
        ↓
06. Section/navigation engine
        ↓
07. Form builder
        ↓
08. Form settings + preview
        ↓
09. Submission engine
        ↓
10. Data-entry engine
        ↓
11. Dataset system
        ↓
12. Autosave/drafts
        ↓
13. JSON/CSV/XLSX export
        ↓
14. PWA/offline infrastructure
        ↓
15. Spreadsheet CMS
        ↓
16. Template package import/export
        ↓
17. Dataset package import/export
        ↓
18. Schema fingerprinting
        ↓
19. Merge engine
        ↓
20. Conflict resolution
        ↓
21. Provenance UI
        ↓
22. Capacitor Android
        ↓
23. Capacitor iOS project preparation
        ↓
24. Automated testing
        ↓
25. Performance benchmarking
        ↓
26. GitHub release pipeline
        ↓
27. Documentation
        ↓
28. Android production release
        ↓
29. iOS TestFlight
        ↓
30. iOS App Store release
```

# 55. Agent Execution Rules

### Rule 1

Do not build the entire application in one step.

Build vertically and incrementally.

### Rule 2

Every phase must leave the application runnable.

### Rule 3

Do not introduce a backend.

### Rule 4

Do not introduce authentication.

### Rule 5

Do not use row numbers as record IDs.

### Rule 6

Do not silently discard records.

### Rule 7

Do not silently resolve merge conflicts.

### Rule 8

Do not silently overwrite existing local data.

### Rule 9

Business logic belongs in shared packages, not React components.

### Rule 10

Do not load heavyweight functionality during startup unless necessary.

### Rule 11

Do not add dependencies without justification.

### Rule 12

Do not sacrifice data integrity for performance.

### Rule 13

Do not sacrifice basic usability for extreme micro-optimizations.

### Rule 14

Profile before optimizing complex code.

### Rule 15

Every important data transformation must have automated tests.

---


### Rule 16

A form template is not a submission and a dataset is not a form.

Keep these entities separate in both the data model and UI.

### Rule 17

Multiple submissions of the same form must be treated as independent records.

Do not introduce locking or conflict behavior merely because two devices use the same template.

### Rule 18

Normal multi-device consolidation is an append/union operation keyed by globally unique submission IDs.

Only duplicate IDs with divergent content should become merge conflicts.

### Rule 19

Different submission IDs with identical values are possible duplicate real-world records, not automatic technical conflicts.

# 56. Golden Path

The following complete workflow is the primary definition of success:

```text
Install/open Forms Offline
        ↓
Create profile
        ↓
Create "Patient Survey"
        ↓
Create fields
        ↓
Save form
        ↓
Create dataset
        ↓
Enter 100 paper records
        ↓
Close application
        ↓
Reopen application
        ↓
All records still exist
        ↓
Export XLSX
        ↓
Export JSON
        ↓
Export template
        ↓
Transfer template to another device
        ↓
Other device imports template
        ↓
Other device enters 100 records
        ↓
Export dataset
        ↓
First device imports dataset
        ↓
System verifies same template
        ↓
System identifies new records
        ↓
System detects duplicates/conflicts
        ↓
User reviews conflicts
        ↓
Datasets merge
        ↓
Final XLSX contains all records
        ↓
Every record retains provenance
```

This entire workflow must work with the network disabled.

---

# 57. Performance Golden Path

On a low-end PC/Chromebook:

```text
Open Forms Offline
        ↓
Application becomes usable quickly
        ↓
Open form
        ↓
Begin typing
        ↓
No visible input lag
        ↓
Enter records
        ↓
Autosave without freezing
        ↓
Open 10K+ record dataset
        ↓
Scroll smoothly through virtualized table
        ↓
Filter/search
        ↓
Edit records
        ↓
Export
```

The application must remain lightweight throughout.

---

# 58. Definition of Done

Forms Offline MVP is complete only when:

1. It works without a backend.
2. It works without authentication.
3. It works offline.
4. It persists local data reliably.
5. Users can create reusable forms with a dedicated Form Builder.
6. Forms support sections, section navigation, question types, validation, settings and preview.
7. The architecture supports conditional section branching.
8. One form version can produce unlimited independent submissions.
9. Every submission has a globally unique submission ID.
10. Multiple devices can use the same template independently.
11. Normal multi-device submissions merge without conflicts.
12. Same-submission divergent edits are detected as conflicts.
13. Users can digitize paper records.
14. Users can edit datasets.
15. Users can export JSON/CSV/XLSX.
16. Users can share templates without accidentally sharing submission data.
17. Users can import datasets.
18. Users can merge datasets created on different devices.
19. Provenance survives merging.
20. Conflicts are detected rather than silently overwritten.
21. The PWA works offline.
22. Android works through Capacitor.
23. The codebase is iOS-ready.
24. Large datasets do not require rendering every row.
25. XLSX functionality does not bloat normal startup.
26. The application remains usable on low-end hardware.
27. Automated tests cover core data operations.
28. A complete backup/restore mechanism exists.
29. GitHub Releases can distribute Android builds.
30. The future iOS distribution path is documented and tested through TestFlight before App Store release.

# 59. Long-Term Architecture

The architecture should allow optional synchronization later without making it mandatory.

Current:

```text
              Forms Offline
                    │
              Local Database
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
      PWA         Android        iOS
```

Possible future:

```text
              Forms Offline
                    │
              Local Database
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
      PWA         Android        iOS
       │            │            │
       └────────────┼────────────┘
                    ↓
             Optional Sync
                    ↓
              Remote Service
```

The optional remote layer must never be required for core offline functionality.

---

# 60. Final Product Principle

Forms Offline should be:

> **A small, fast, offline-first bridge between paper records and structured digital data.**

The application should not become a cloud platform merely because cloud services are convenient.

The central product promise is:

```text
Paper
  ↓
Forms Offline
  ↓
Local structured data
  ↓
JSON / CSV / XLSX
  ↓
Merge / analyze / share
```

with:

```text
No account.
No backend.
No mandatory internet.
No unnecessary tracking.
No unnecessary complexity.
```

And despite that simplicity, the underlying architecture must be strong enough to support large datasets, multi-device consolidation, schema evolution, provenance and future iOS/public distribution.
