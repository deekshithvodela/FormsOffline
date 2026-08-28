import React from 'react';
import { AlertTriangle, X, ShieldAlert, FileText, Scale, Lock } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
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
        maxWidth: '680px',
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
          title="Close Disclaimer Modal"
          aria-label="Close Disclaimer Modal"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <AlertTriangle size={28} color="var(--accent-amber)" />
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Disclaimer & Limitation of Liability</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Important Legal Terms & Local Data Custody Disclosures</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <Lock size={24} color="var(--primary)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                1. Local Data Custody & Sole User Responsibility
              </strong>
              Forms Offline operates 100% client-side. All form schemas, submission records, attachments, passphrases, and exports reside exclusively on your local device. The software author, maintainers, and contributors have zero access to your data. You are solely responsible for local data backups, device security, password management, and unencrypted export handling. The author shall not be liable for any data loss, device hardware damage, OS crash, or browser cache wipe.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <Scale size={24} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                2. Software Provided "AS IS" Without Warranties
              </strong>
              The application is provided "AS IS" and "AS AVAILABLE", without warranties or conditions of any kind, whether express, implied, statutory, or otherwise (including warranties of merchantability, fitness for a particular purpose, non-infringement, or system integration).
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <ShieldAlert size={24} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                3. Prohibition of Unlawful or Illegal Misuse
              </strong>
              Forms Offline is designed as a legitimate field survey and offline digitization tool. Users agree not to use the software for any unlawful, illegal, fraudulent, harassing, malicious, or policy-violating activities. The author disclaims all liability for any illegal, unauthorized, or improper actions conducted by third parties using this software.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
            <FileText size={24} color="var(--accent-purple)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                4. Absolute Limitation of Liability ($0 USD Cap)
              </strong>
              To the maximum extent permitted by applicable law, in no event shall the author, maintainers, or copyright holders be liable for any direct, indirect, incidental, special, exemplary, punitive, or consequential damages (including loss of use, data, revenue, or business interruption) arising in any way out of the use of this software. Maximum cumulative liability under all circumstances is capped at $0.00 USD.
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
