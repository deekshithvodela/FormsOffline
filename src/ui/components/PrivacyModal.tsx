import React from 'react';
import { ShieldCheck, X, HardDrive, Lock, EyeOff } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10500,
      padding: '1rem',
      overscrollBehavior: 'contain',
      touchAction: 'none'
    }}>
      <div className="card" style={{
        maxWidth: '650px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            color: 'var(--text-secondary)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <ShieldCheck size={28} color="var(--accent-green)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Privacy & Zero-Telemetry Guarantee</h2>
        </div>

        <div style={{ display: 'grid', gap: '1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <HardDrive size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block' }}>100% Local-First Storage</strong>
              All form schemas, records, and preferences are stored exclusively inside your browser's IndexedDB. No data ever leaves your device unless you explicitly export or sync it.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <EyeOff size={24} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Zero Telemetry & Zero Analytics</strong>
              Forms Offline contains zero tracking scripts, zero Google Analytics, zero error loggers, and zero external network calls.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <Lock size={24} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Client-Side End-to-End Encryption (E2EE)</strong>
              Optional E2EE uses WebCrypto AES-GCM 256-bit encryption before exporting or syncing, ensuring raw records cannot be read without your private passphrase.
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
