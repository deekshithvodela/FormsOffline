import React, { useState, useEffect } from 'react';
import { FileText, Database, Shield, PenTool, HardDrive, User, Folder, Combine, Sun, Moon, HelpCircle, X, ChevronRight, ArrowDownToLine } from 'lucide-react';
import { PrivacyModal } from '../components/PrivacyModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { InstallAppModal } from '../components/InstallAppModal';
import { LongPressTooltip } from '../components/LongPressTooltip';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getStorageMetrics, requestPersistentStorage, StorageMetrics, db } from '../../db/database';
import { seedDefaultTemplates } from '../../db/defaultTemplates';
import { UserProfile } from '../../core/types';

interface AppShellProps {
  activeTab: 'dashboard' | 'builder' | 'entry' | 'cms' | 'import' | 'help';
  onSelectTab: (tab: 'dashboard' | 'builder' | 'entry' | 'cms' | 'import' | 'help') => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ activeTab, onSelectTab, children }) => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).__pwaInstallPrompt || null);
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme === 'dark' || docTheme === 'light') return docTheme;
    }
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('forms_offline_theme') : null;
    if (saved === 'dark' || saved === 'light') return saved;
    return (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  });

  // Lock body scroll when mobile navigation drawer is open
  useBodyScrollLock(isMobileDrawerOpen);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('forms_offline_theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc');
    }
  }, [theme]);

  // Detect PWA installability and standalone status
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandaloneMode(standalone);
    };
    checkStandalone();

    if ((window as any).__pwaInstallPrompt) {
      setDeferredPrompt((window as any).__pwaInstallPrompt);
    }

    const handlePromptReady = () => {
      if ((window as any).__pwaInstallPrompt) {
        setDeferredPrompt((window as any).__pwaInstallPrompt);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandaloneMode(true);
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
    };

    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandaloneMode(true);
        }
        setDeferredPrompt(null);
        (window as any).__pwaInstallPrompt = null;
      } catch (err) {
        console.error('Failed to trigger PWA install prompt:', err);
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loadUserProfile = async () => {
    try {
      const profiles = await db.userProfile.toArray();
      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
      }
    } catch (err) {
      console.error('Failed to load user profile in AppShell:', err);
    }
  };

  const loadStorage = async () => {
    try {
      await requestPersistentStorage();
      const metrics = await getStorageMetrics();
      setStorageMetrics(metrics);
    } catch (err) {
      console.error('Failed to load storage metrics:', err);
    }
  };

  useEffect(() => {
    seedDefaultTemplates().catch((err) => console.error('Seeder execution error:', err));
    loadUserProfile();
    loadStorage();

    const handleStorageChange = () => loadStorage();
    window.addEventListener('forms_offline_storage_updated', handleStorageChange);
    return () => {
      window.removeEventListener('forms_offline_storage_updated', handleStorageChange);
    };
  }, []);

  const navItems: { id: 'dashboard' | 'builder' | 'entry' | 'cms' | 'import' | 'help'; title: string; desc: string; icon: any }[] = [
    { id: 'dashboard', title: 'Forms Dashboard', desc: 'Manage offline templates & launch data capture', icon: Folder },
    { id: 'builder', title: 'Form Builder', desc: 'Author zero-backend forms with section branching', icon: PenTool },
    { id: 'entry', title: 'Rapid Entry', desc: 'High-speed offline form response collector', icon: FileText },
    { id: 'cms', title: 'Dataset CMS', desc: 'Spreadsheet viewer, version history & Excel export', icon: Database },
    { id: 'import', title: 'Data Consolidator', desc: 'Merge multi-device .formdata packages', icon: Combine },
    { id: 'help', title: 'Help', desc: 'Comprehensive offline guide & knowledge base', icon: HelpCircle },
  ];

  const handleSelectNavTab = (tab: 'dashboard' | 'builder' | 'entry' | 'cms' | 'import' | 'help') => {
    if (activeTab === tab) {
      setIsMobileDrawerOpen(true);
    } else {
      onSelectTab(tab);
      setIsMobileDrawerOpen(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div
          className="app-logo app-header-left"
          onClick={() => setIsMobileDrawerOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsMobileDrawerOpen(true)}
          aria-label="Forms Offline Logo - Open Navigation Sheet"
          title="Click to open full navigation reference menu"
        >
          <FileText size={26} color="var(--primary)" />
          <span>Forms Offline</span>
          <span className="badge badge-green">100% Offline</span>
        </div>

        <nav className="app-nav" aria-label="Main Application Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <LongPressTooltip key={item.id} label={item.title} position="bottom">
                <button
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectNavTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.title}
                >
                  <Icon size={18} />
                  <span className="nav-link-text">{item.title}</span>
                </button>
              </LongPressTooltip>
            );
          })}
        </nav>

        <div className="app-header-right">
          <button
            className="btn btn-outline btn-sm"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          >
            {theme === 'dark' ? <Sun size={16} color="var(--accent-amber)" /> : <Moon size={16} color="var(--primary)" />}
          </button>

          {!isStandaloneMode && (
            <button
              className="btn btn-outline btn-sm install-app-btn"
              onClick={handleInstallApp}
              title="Install Forms Offline on your device for instant offline launch"
              aria-label="Install Forms Offline App"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                background: 'var(--primary-light)'
              }}
            >
              <ArrowDownToLine size={15} />
              <span className="header-btn-label" style={{ fontWeight: 600 }}>Install App</span>
            </button>
          )}

          {storageMetrics && (
            <div className="storage-metrics-pill" title="Local IndexedDB Storage Used">
              <HardDrive size={14} color="var(--accent-blue)" />
              <span>{(storageMetrics.usageBytes / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          )}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => setIsProfileOpen(true)}
            title="Configure Operator Profile"
            aria-label="Configure Operator Profile"
          >
            <User size={15} color="var(--primary)" />
            <span className="header-btn-label">{userProfile?.alias || 'Operator'}</span>
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={() => setIsPrivacyOpen(true)}
            title="View Zero-Telemetry Privacy Policy"
            aria-label="View Zero-Telemetry Privacy Policy"
          >
            <Shield size={15} color="var(--accent-green)" />
            <span className="header-btn-label">Privacy</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <div className="footer-meta-left">
          <span>Forms Offline • Created by{' '}
            <a
              href="https://linktr.ee/deekshithvodela"
              target="_blank"
              rel="noopener noreferrer"
            >
              Deekshith Vodela
            </a>{' '}
            • 100% Offline & Privacy-First • MIT License
          </span>
        </div>
        <div className="footer-meta-right">
          <span className="badge badge-purple">v1.1.0</span>
          <span>IndexedDB Local Storage</span>
        </div>
      </footer>

      {isMobileDrawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="mobile-nav-drawer-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div className="drawer-title">
                <Folder size={20} color="var(--primary)" />
                <span>Navigation Menu</span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setIsMobileDrawerOpen(false)}
                title="Close Navigation Drawer"
                aria-label="Close Navigation Drawer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="drawer-list">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`btn drawer-nav-item ${isActive ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleSelectNavTab(item.id)}
                  >
                    <Icon size={18} />
                    <div className="drawer-nav-text-container">
                      <div className="drawer-nav-title">{item.title}</div>
                      <div className="drawer-nav-desc">{item.desc}</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                );
              })}
            </div>

            <div className="drawer-footer">
              <div className="storage-metrics-pill">
                <strong>Forms Offline v1.1.0</strong> • Zero Backend PWA
              </div>
            </div>
          </div>
        </div>
      )}

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={(updated) => setUserProfile(updated)}
      />
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onNativeInstall={handleInstallApp}
        canNativeInstall={!!deferredPrompt}
      />
    </div>
  );
};
