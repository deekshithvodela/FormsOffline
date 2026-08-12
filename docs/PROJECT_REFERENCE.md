# Forms Offline — Project Technical Reference Index

> **Auto-Generated File**: Do not edit manually. Updated automatically via `npm run build:reference`.
> Last generated: 2026-08-12T18:26:45.405Z

## ⚠️ CRITICAL GIT BRANCHING & RELEASE SAFEGUARD DIRECTIVE

1. **`antigravity-dev` is SACRED**: All micro-commits on `antigravity-dev` represent detailed local development history. **NEVER squash, reset, rebase, or mutate history on `antigravity-dev`**.
2. **NEVER PUSH `antigravity-dev` TO REMOTE**: The `antigravity-dev` branch is strictly for local workspace history. **Executing `git push origin antigravity-dev` is STRICTLY FORBIDDEN**.
3. **`main` Release Commit Protocol**: `main` is strictly used for clean version release commits (`v1.0.0`, `v1.1.0`). When pushing to `main`, bring the current snapshot from `antigravity-dev` as a single clean release commit onto `main`, push `main` to `origin/main`, and **immediately return to `antigravity-dev`**.
4. **NO UNSOLICITED PUSHES**: NEVER execute `git push` unless explicitly prompted by the user.

## 1. Project Directory & File Map

| Relative File Path | Total Lines | Exports Count | Types/Interfaces |
| :--- | :---: | :---: | :---: |
| `src/App.tsx` | 106 | 1 | 0 |
| `src/core/branching/evaluator.ts` | 93 | 2 | 0 |
| `src/core/crypto/e2ee.ts` | 84 | 0 | 0 |
| `src/core/fingerprint/canonicalJson.ts` | 26 | 1 | 0 |
| `src/core/fingerprint/templateHasher.ts` | 133 | 0 | 0 |
| `src/core/merge/mergeEngine.ts` | 97 | 0 | 0 |
| `src/core/types/index.ts` | 171 | 0 | 17 |
| `src/db/database.ts` | 81 | 2 | 1 |
| `src/db/defaultTemplates.ts` | 322 | 0 | 0 |
| `src/main.tsx` | 12 | 0 | 0 |
| `src/services/RemoteSyncService.ts` | 51 | 0 | 0 |
| `src/services/UpdateService.ts` | 45 | 0 | 1 |
| `src/services/exportService.ts` | 241 | 4 | 0 |
| `src/services/formLinkParser.ts` | 243 | 1 | 1 |
| `src/styles/components.css` | 922 | 0 | 0 |
| `src/styles/theme.css` | 680 | 0 | 0 |
| `src/ui/builder/FormBuilder.tsx` | 1850 | 1 | 0 |
| `src/ui/cms/EditSubmissionModal.tsx` | 582 | 1 | 0 |
| `src/ui/cms/SpreadsheetGrid.tsx` | 756 | 1 | 0 |
| `src/ui/components/LongPressTooltip.tsx` | 90 | 1 | 0 |
| `src/ui/components/PrivacyModal.tsx` | 84 | 1 | 0 |
| `src/ui/components/ResetCanvasModal.tsx` | 123 | 1 | 0 |
| `src/ui/components/SaveTemplateModal.tsx` | 83 | 1 | 0 |
| `src/ui/components/SmartFormImporterModal.tsx` | 168 | 1 | 0 |
| `src/ui/components/TemplateGalleryModal.tsx` | 370 | 1 | 0 |
| `src/ui/components/UserProfileModal.tsx` | 126 | 1 | 0 |
| `src/ui/dashboard/FormsDashboard.tsx` | 399 | 1 | 0 |
| `src/ui/entry/RapidEntry.tsx` | 995 | 1 | 0 |
| `src/ui/help/HelpTab.tsx` | 427 | 1 | 0 |
| `src/ui/import/DataConsolidator.tsx` | 396 | 1 | 0 |
| `src/ui/layout/AppShell.tsx` | 241 | 1 | 0 |
| `src/ui/merge/ConflictResolverModal.tsx` | 130 | 1 | 0 |

## 2. Exported Interfaces & Type Registry

### `src/core/types/index.ts`
- **type** `FieldType` (Line 7)
- **type** `AllowedFileType` (Line 25)
- **interface** `FieldValidation` (Line 36)
- **interface** `FieldOption` (Line 50)
- **interface** `FormField` (Line 56)
- **type** `BranchOperator` (Line 71)
- **interface** `BranchingCondition` (Line 80)
- **interface** `BranchingRule` (Line 86)
- **interface** `FormSection` (Line 92)
- **interface** `FormTemplateSettings` (Line 100)
- **interface** `FormTemplate` (Line 111)
- **type** `SubmissionStatus` (Line 124)
- **interface** `ProvenanceEntry` (Line 126)
- **interface** `FormSubmission` (Line 135)
- **interface** `FieldConflict` (Line 150)
- **interface** `MergeResult` (Line 158)
- **interface** `UserProfile` (Line 164)

### `src/db/database.ts`
- **interface** `StorageMetrics` (Line 49)

### `src/services/UpdateService.ts`
- **interface** `UpdateInfo` (Line 8)

### `src/services/formLinkParser.ts`
- **interface** `LinkParseResult` (Line 4)

## 3. Exported APIs, Components & Utilities

### `src/App.tsx`
- **const** `App` (Line 47) — `export const App: React.FC = () => {`

### `src/core/branching/evaluator.ts`
- **function** `evaluateCondition` (Line 9) — `export function evaluateCondition(`
- **function** `getNextSectionId` (Line 56) — `export function getNextSectionId(`

### `src/core/fingerprint/canonicalJson.ts`
- **function** `canonicalizeJSON` (Line 8) — `export function canonicalizeJSON(val: any): string {`

### `src/db/database.ts`
- **class** `FormsOfflineDatabase` (Line 11) — `export class FormsOfflineDatabase extends Dexie {`
- **const** `db` (Line 27) — `export const db = new FormsOfflineDatabase();`

### `src/services/exportService.ts`
- **function** `exportToCSV` (Line 12) — `export function exportToCSV(template: FormTemplate, submissions: FormSubmission[...`
- **function** `exportFormDataPackage` (Line 192) — `export function exportFormDataPackage(template: FormTemplate, submissions: FormS...`
- **function** `exportFormTemplatePackage` (Line 203) — `export function exportFormTemplatePackage(template: FormTemplate): string {`
- **function** `downloadBlob` (Line 231) — `export function downloadBlob(blob: Blob, filename: string) {`

### `src/services/formLinkParser.ts`
- **function** `normalizeFormUrl` (Line 186) — `export function normalizeFormUrl(inputUrl: string): string {`

### `src/ui/builder/FormBuilder.tsx`
- **const** `FormBuilder` (Line 48) — `export const FormBuilder: React.FC<FormBuilderProps> = ({ initialTemplate }) => ...`

### `src/ui/cms/EditSubmissionModal.tsx`
- **const** `EditSubmissionModal` (Line 15) — `export const EditSubmissionModal: React.FC<EditSubmissionModalProps> = ({`

### `src/ui/cms/SpreadsheetGrid.tsx`
- **const** `SpreadsheetGrid` (Line 16) — `export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({`

### `src/ui/components/LongPressTooltip.tsx`
- **const** `LongPressTooltip` (Line 12) — `export const LongPressTooltip: React.FC<LongPressTooltipProps> = ({`

### `src/ui/components/PrivacyModal.tsx`
- **const** `PrivacyModal` (Line 9) — `export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) =...`

### `src/ui/components/ResetCanvasModal.tsx`
- **const** `ResetCanvasModal` (Line 10) — `export const ResetCanvasModal: React.FC<ResetCanvasModalProps> = ({`

### `src/ui/components/SaveTemplateModal.tsx`
- **const** `SaveTemplateModal` (Line 11) — `export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({`

### `src/ui/components/SmartFormImporterModal.tsx`
- **const** `SmartFormImporterModal` (Line 12) — `export const SmartFormImporterModal: React.FC<SmartFormImporterModalProps> = ({`

### `src/ui/components/TemplateGalleryModal.tsx`
- **const** `TemplateGalleryModal` (Line 13) — `export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({`

### `src/ui/components/UserProfileModal.tsx`
- **const** `UserProfileModal` (Line 12) — `export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onCl...`

### `src/ui/dashboard/FormsDashboard.tsx`
- **const** `FormsDashboard` (Line 12) — `export const FormsDashboard: React.FC<FormsDashboardProps> = ({ onNavigate }) =>...`

### `src/ui/entry/RapidEntry.tsx`
- **const** `RapidEntry` (Line 15) — `export const RapidEntry: React.FC<RapidEntryProps> = ({`

### `src/ui/help/HelpTab.tsx`
- **const** `HelpTab` (Line 18) — `export const HelpTab: React.FC = () => {`

### `src/ui/import/DataConsolidator.tsx`
- **const** `DataConsolidator` (Line 8) — `export const DataConsolidator: React.FC = () => {`

### `src/ui/layout/AppShell.tsx`
- **const** `AppShell` (Line 16) — `export const AppShell: React.FC<AppShellProps> = ({ activeTab, onSelectTab, chil...`

### `src/ui/merge/ConflictResolverModal.tsx`
- **const** `ConflictResolverModal` (Line 14) — `export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({`

## 4. CSS Custom Properties / Styling Tokens

- `--font-family`
- `--bg-main`
- `--bg-card`
- `--bg-card-hover`
- `--bg-input`
- `--border-color`
- `--border-focus`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--primary`
- `--primary-hover`
- `--primary-light`
- `--accent-green`
- `--accent-blue`
- `--accent-amber`
- `--accent-rose`
- `--accent-purple`
- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--shadow-sm`
- `--shadow-md`
- `--shadow-lg`
- `--transition`

