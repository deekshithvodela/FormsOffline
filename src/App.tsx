import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AppShell } from './ui/layout/AppShell';
import { FormTemplate } from './core/types';
import { Loader2 } from 'lucide-react';
import './styles/theme.css';

// Code-split tab views via dynamic imports for optimized Core Web Vitals & initial page load speed
const FormsDashboard = lazy(() => import('./ui/dashboard/FormsDashboard').then(m => ({ default: m.FormsDashboard })));
const FormBuilder = lazy(() => import('./ui/builder/FormBuilder').then(m => ({ default: m.FormBuilder })));
const RapidEntry = lazy(() => import('./ui/entry/RapidEntry').then(m => ({ default: m.RapidEntry })));
const SpreadsheetGrid = lazy(() => import('./ui/cms/SpreadsheetGrid').then(m => ({ default: m.SpreadsheetGrid })));
const DataConsolidator = lazy(() => import('./ui/import/DataConsolidator').then(m => ({ default: m.DataConsolidator })));
const HelpTab = lazy(() => import('./ui/help/HelpTab').then(m => ({ default: m.HelpTab })));

type TabType = 'dashboard' | 'builder' | 'entry' | 'cms' | 'import' | 'help';

const getBasePath = (): string => {
  const b = import.meta.env.BASE_URL || '/';
  return b.replace(/\/+$/, '');
};

const tabToPath = (tab: TabType): string => {
  const base = getBasePath();
  switch (tab) {
    case 'builder': return `${base}/builder`;
    case 'entry': return `${base}/entry`;
    case 'cms': return `${base}/cms`;
    case 'import': return `${base}/consolidate`;
    case 'help': return `${base}/help`;
    case 'dashboard':
    default:
      return `${base}/dashboard`;
  }
};

const pathToTab = (path: string): TabType => {
  const clean = path.replace(/\/+$/, '').toLowerCase();
  if (clean.endsWith('/builder')) return 'builder';
  if (clean.endsWith('/entry')) return 'entry';
  if (clean.endsWith('/cms')) return 'cms';
  if (clean.endsWith('/consolidate')) return 'import';
  if (clean.endsWith('/help')) return 'help';
  return 'dashboard';
};

const ViewLoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '0.75rem', color: 'var(--text-muted)' }}>
    <Loader2 size={32} className="spin" color="var(--primary)" />
    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading view...</span>
  </div>
);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(() => pathToTab(window.location.pathname));
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(pathToTab(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateTabAndUrl = (tab: TabType) => {
    setActiveTab(tab);
    const targetPath = tabToPath(tab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  };

  const handleNavigate = (tab: TabType, template?: FormTemplate) => {
    setSelectedTemplate(template || null);
    updateTabAndUrl(tab);
  };

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'builder' || tab === 'entry' || tab === 'cms') {
      setSelectedTemplate(null);
    }
    updateTabAndUrl(tab);
  };

  return (
    <AppShell activeTab={activeTab} onSelectTab={handleSelectTab}>
      <Suspense fallback={<ViewLoadingFallback />}>
        {activeTab === 'dashboard' && <FormsDashboard onNavigate={handleNavigate} />}
        {activeTab === 'builder' && <FormBuilder initialTemplate={selectedTemplate} />}
        {activeTab === 'entry' && (
          <RapidEntry
            activeTemplate={selectedTemplate}
            onNavigateToCMS={(tpl) => handleNavigate('cms', tpl)}
            onNavigateToDashboard={() => handleNavigate('dashboard')}
          />
        )}
        {activeTab === 'cms' && (
          <SpreadsheetGrid
            activeTemplate={selectedTemplate}
            onNavigateToEntry={(tpl) => handleNavigate('entry', tpl)}
            onNavigateToDashboard={() => handleNavigate('dashboard')}
          />
        )}
        {activeTab === 'import' && <DataConsolidator />}
        {activeTab === 'help' && <HelpTab />}
      </Suspense>
    </AppShell>
  );
};

export default App;
