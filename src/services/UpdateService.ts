/**
 * Forms Offline — Zero-Telemetry In-App Update Checker
 * 
 * Performs read-only check against GitHub Releases API when online.
 * Fails silently when offline without throwing errors or collecting telemetry.
 */

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export async function checkForAppUpdates(currentVersion: string): Promise<UpdateInfo> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { hasUpdate: false };
  }

  try {
    const response = await fetch('https://api.github.com/repos/deekshithvodela/forms-offline/releases/latest', {
      headers: { Accept: 'application/vnd.github.v3+json' },
      cache: 'no-cache'
    });

    if (!response.ok) return { hasUpdate: false };

    const data = await response.json();
    const latestVersion = data.tag_name?.replace(/^v/, '');

    if (latestVersion && latestVersion !== currentVersion) {
      return {
        hasUpdate: true,
        latestVersion,
        releaseNotes: data.body || '',
        downloadUrl: data.html_url
      };
    }
  } catch (err) {
    // Silent fail when offline or network fails
  }

  return { hasUpdate: false };
}
