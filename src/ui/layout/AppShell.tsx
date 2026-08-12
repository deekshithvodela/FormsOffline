import React, { useState, useEffect } from 'react';
import { FileText, Database, Shield, PenTool, HardDrive, User, Folder, Combine, Sun, Moon, HelpCircle, X, ChevronRight } from 'lucide-react';
import { PrivacyModal } from '../components/PrivacyModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { LongPressTooltip } from '../components/LongPressTooltip';
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('forms_offline_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('forms_offline_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const loadUserProfile = async () => {
    try {
      const existing = await db.userProfile.limit(1).first();
      if (existing) {
        setUserProfile(existing);
      }
    } catch (err) {
      console.error('Failed to load user profile in shell:', err);
    }
  };

  useEffect(() => {
    seedDefaultTemplates().catch((err) => console.error('Seeder execution error:', err));
    loadUserProfile();
    requestPersistentStorage();
    getStorageMetrics().then((metrics) => setStorageMetrics(metrics));

    const handleStorageChange = () => {
      getStorageMetrics().then((metrics) => setStorageMetrics(metrics));
    };

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
            <span>{userProfile?.alias || 'Operator'}</span>
          </button>

          <button
            className="btn btn-outline btn-sm"
            onClick={() => setIsPrivacyOpen(true)}
            title="View Zero-Telemetry Privacy Policy"
            aria-label="View Zero-Telemetry Privacy Policy"
          >
            <Shield size={15} color="var(--accent-green)" />
            <span>Privacy</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>

      <footer className="app-footer">
        <div>
          Forms Offline • Created by{' '}
          <a
            href="https://linktr.ee/deekshithvodela"
            target="_blank"
            rel="noopener noreferrer"
          >
            Deekshith Vodela
          </a>{' '}
          • 100% Offline & Privacy-First • MIT License
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
    </div>
  );
};
