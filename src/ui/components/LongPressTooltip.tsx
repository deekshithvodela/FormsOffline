import React, { useState, useRef } from 'react';

interface LongPressTooltipProps {
  label: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const LongPressTooltip: React.FC<LongPressTooltipProps> = ({
  label,
  children,
  position = 'top',
  delay = 350,
  style,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchRef = useRef(false);

  const startPress = () => {
    isTouchRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);

    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      // Auto-hide after 2.5 seconds
      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2500);
    }, delay);
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isVisible) {
      autoHideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        isTouchRef.current = false;
      }, 1200);
    } else {
      setTimeout(() => {
        isTouchRef.current = false;
      }, 300);
    }
  };

  const handleMouseEnter = () => {
    // Ignore synthetic mouse events caused by mobile touch taps
    if (!isTouchRef.current) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchRef.current) {
      setIsVisible(false);
    }
    endPress();
  };

  return (
    <div
      className={`long-press-tooltip-wrapper ${className}`}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onTouchMove={endPress}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && label && (
        <div className={`long-press-tooltip position-${position}`} role="tooltip">
          {label}
        </div>
      )}
    </div>
  );
};
