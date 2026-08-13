import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, RefreshCw, Check, AlertCircle, Upload, Video } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: { name: string; type: string; size: number; data: string }) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Physical Form Photo'
}) => {
  useBodyScrollLock(isOpen);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Stop active video stream
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start video stream for a specific deviceId
  const startCamera = async (deviceId?: string) => {
    stopStream();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Enumerate devices once stream is active to get full device labels
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);

      // Track active device
      const currentTrack = stream.getVideoTracks()[0];
      const activeSettings = currentTrack?.getSettings();
      if (activeSettings?.deviceId) {
        setSelectedDeviceId(activeSettings.deviceId);
        localStorage.setItem('preferred_camera_device_id', activeSettings.deviceId);
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission was denied. Please allow camera access or upload an image file directly.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera hardware found. You can upload an image file directly from your computer.');
      } else {
        setErrorMsg('Unable to access camera. Please check your camera connection or upload a file.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setErrorMsg(null);
      const savedDeviceId = localStorage.getItem('preferred_camera_device_id') || undefined;
      startCamera(savedDeviceId);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Switch camera device
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    localStorage.setItem('preferred_camera_device_id', newDeviceId);
    startCamera(newDeviceId);
  };

  // Capture snapshot from live video feed
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedImage(dataUrl);
  };

  // Confirm and save captured photo
  const handleConfirm = () => {
    if (!capturedImage) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Photo_${timestamp}.jpg`;
    
    // Estimate byte size from base64 string
    const stringLength = capturedImage.length - 'data:image/jpeg;base64,'.length;
    const sizeInBytes = Math.round((stringLength * 3) / 4);

    onCapture({
      name: fileName,
      type: 'image/jpeg',
      size: sizeInBytes,
      data: capturedImage
    });
    onClose();
  };

  // Handle fallback file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onCapture({
          name: file.name,
          type: file.type || 'image/jpeg',
          size: file.size,
          data: reader.result
        });
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

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
        backdropFilter: 'blur(4px)',
        zIndex: 10600,
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
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Camera size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}
            title="Close Viewfinder"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Device Selector & Viewfinder Area */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {/* Multi-Camera Selector Dropdown */}
          {devices.length > 1 && !capturedImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Video size={16} color="var(--primary)" />
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Select Camera:
              </label>
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                style={{ flex: 1, fontSize: '0.82rem', padding: '0.3rem 0.5rem', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1} (${device.deviceId.slice(0, 8)}...)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-rose)', color: 'var(--accent-rose)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Camera Unavailable</div>
                <div>{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Viewfinder / Freeze-Frame Preview Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '280px',
              maxHeight: '440px',
              backgroundColor: '#0f172a',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)'
            }}
          >
            {capturedImage ? (
              // Freeze-Frame Captured Review
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '440px' }}
              />
            ) : (
              // Live Video Stream
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    maxHeight: '440px',
                    objectFit: 'contain',
                    display: errorMsg ? 'none' : 'block'
                  }}
                />

                {/* Document Framing Guidelines Overlay */}
                {!errorMsg && !isLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8%',
                      left: '8%',
                      right: '8%',
                      bottom: '8%',
                      border: '2px dashed rgba(255, 255, 255, 0.4)',
                      borderRadius: '8px',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '8px'
                    }}
                  >
                    <span style={{ background: 'rgba(0, 0, 0, 0.6)', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
                      Align physical document inside frame
                    </span>
                  </div>
                )}
              </>
            )}

            {isLoading && !errorMsg && !capturedImage && (
              <div style={{ color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} className="spin" />
                <span>Initializing camera stream...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)'
          }}
        >
          {/* File Upload Fallback */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Upload size={14} />
              <span>Choose File Instead</span>
            </button>
          </div>

          {/* Shutter / Review Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {capturedImage ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setCapturedImage(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Check size={16} />
                  <span>Use This Photo</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={takeSnapshot}
                disabled={isLoading || !!errorMsg}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1.25rem' }}
              >
                <Camera size={18} />
                <span>Capture Snapshot</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
