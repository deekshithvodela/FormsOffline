import React, { useState, useEffect } from 'react';
import { User, Check, X, HardDrive } from 'lucide-react';
import { db } from '../../db/database';
import { UserProfile } from '../../core/types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onProfileUpdated }) => {
  useBodyScrollLock(isOpen);

  const [alias, setAlias] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.userProfile.toArray().then((profiles) => {
        if (profiles.length > 0) {
          setAlias(profiles[0].alias);
          setDeviceId(profiles[0].deviceId);
        } else {
          const newDeviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          setAlias('Operator 1');
          setDeviceId(newDeviceId);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Strip zero-width & invisible unicode characters (\u200B-\u200D, \uFEFF, \u00A0, control codes)
    const cleanInvisible = rawVal.replace(/[\u200B-\u200D\uFEFF\u00A0\u0000-\u001F\u007F-\u009F]/g, '');
    // Keep only alphanumeric characters, underscores, hyphens, and single spaces
    const cleanChars = cleanInvisible.replace(/[^a-zA-Z0-9_\- ]/g, '');
    const singleSpaced = cleanChars.replace(/\s+/g, ' ');
    setAlias(singleSpaced.slice(0, 32));
  };

  const handleSave = async () => {
    const activeAlias = alias.trim() || 'Operator';
    const activeDeviceId = deviceId || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const profileObj: UserProfile = {
      id: 'default_profile',
      deviceId: activeDeviceId,
      alias: activeAlias,
      createdAt: new Date().toISOString()
    };

    await db.userProfile.put(profileObj);
    if (onProfileUpdated) onProfileUpdated(profileObj);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.65)',
      zIndex: 10500,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overscrollBehavior: 'contain',
      touchAction: 'none'
    }}>
      <div className="card" style={{ width: '480px', maxWidth: '92vw', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Operator Profile Setup</h2>
          </div>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.3rem' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Configure your local operator identifier. This alias will be stamped into submission provenance logs and CSV/Excel exports.
        </p>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Operator / Respondent Alias
            </label>
            <input
              type="text"
              value={alias}
              onChange={handleAliasChange}
              placeholder="e.g. Operator 14, Field Inspector"
              maxLength={32}
              style={{ width: '100%' }}
            />
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Allowed: Letters, numbers, spaces, hyphens, and underscores (Max 32 chars). Zero-width/invisible characters automatically blocked.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Persistent Device Identifier
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
              <HardDrive size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{deviceId}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {savedSuccess ? (
              <>
                <Check size={16} /> Saved!
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
