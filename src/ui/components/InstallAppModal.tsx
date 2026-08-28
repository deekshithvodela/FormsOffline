import React, { useState } from 'react';
import { X, ArrowDownToLine, Smartphone, Monitor, Share, ShieldCheck } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  canNativeInstall?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onNativeInstall,
  canNativeInstall = false
}) => {
  useBodyScrollLock(isOpen);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
  const isAndroid = /Android/.test(navigator.userAgent);
  const defaultTab = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 10800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overscrollBehavior: 'contain',
        touchAction: 'none'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              <ArrowDownToLine size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Install Forms Offline
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Run as a standalone app with 100% offline data access
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem' }}>
          {/* Quick Native Install Button (if available) */}
          {canNativeInstall && onNativeInstall && (
            <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onNativeInstall();
                  onClose();
                }}
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
              >
                <ArrowDownToLine size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Install App on This Device</span>
              </button>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Click above for 1-click automatic installation
              </div>
            </div>
          )}

          {/* OS Switcher Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'ios' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('ios')}
              style={{ flex: 1, border: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
            >
              <Smartphone size={14} /> iPhone / iPad
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'android' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('android')}
              style={{ flex: 1, border: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
            >
              <Smartphone size={14} /> Android
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'desktop' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('desktop')}
              style={{ flex: 1, border: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
            >
              <Monitor size={14} /> PC / Mac
            </button>
          </div>

          {/* iOS Instructions */}
          {activeTab === 'ios' && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  1
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  In Safari, tap the <strong>Share</strong> button <Share size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> in the toolbar at the bottom of the screen.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  2
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Scroll down the share menu and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  3
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Tap <strong>Add</strong> in the top right corner. Forms Offline will appear on your Home Screen!
                </div>
              </div>
            </div>
          )}

          {/* Android Instructions */}
          {activeTab === 'android' && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  1
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Tap the <strong>three dots (⋮)</strong> menu icon in Chrome or your Android browser (top right).
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  2
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Select <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  3
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Confirm <strong>Install</strong> to add the icon to your app drawer and home screen.
                </div>
              </div>
            </div>
          )}

          {/* Desktop Instructions */}
          {activeTab === 'desktop' && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  1
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  In Chrome or Edge, look for the <strong>Install icon</strong> (<ArrowDownToLine size={13} style={{ display: 'inline' }} />) on the right side of the URL address bar.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                  2
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Click <strong>Install</strong> to launch Forms Offline in its own dedicated, distraction-free desktop window.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={14} color="var(--accent-green)" />
            <span>Zero internet required after installation</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
