/**
 * Forms Offline — Global Window Type Augmentations
 *
 * Provides proper TypeScript types for browser APIs that lack built-in declarations,
 * eliminating the need for `(window as any)` casts throughout the codebase.
 */

/**
 * BeforeInstallPromptEvent — fired when the browser determines
 * the PWA meets installability criteria.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  interface Window {
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  // Navigator.standalone is a non-standard iOS Safari property
  interface Navigator {
    readonly standalone?: boolean;
  }
}

export {};
