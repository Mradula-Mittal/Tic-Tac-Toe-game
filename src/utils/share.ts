/**
 * Utility functions for sharing games and copying game invites across users.
 */

/**
 * Returns the current active shareable URL for this game session.
 * Uses window.location.origin so the link accurately matches the currently running host
 * and avoids 404 Page Not Found errors on un-deployed preview URLs.
 */
export function getShareableGameUrl(gameCode: string): string {
  if (typeof window === 'undefined') return `?game=${gameCode}`;

  const origin = window.location.origin;
  const pathname = window.location.pathname.replace(/\/+$/, '') || '';
  return `${origin}${pathname}/?game=${encodeURIComponent(gameCode.toUpperCase())}`;
}

/**
 * Returns the public preview URL (ais-pre-*) which works for external users
 * once the application is shared via the AI Studio Share button.
 */
export function getPublicPreviewGameUrl(gameCode: string): string {
  if (typeof window === 'undefined') return `?game=${gameCode}`;

  const origin = window.location.origin.replace('ais-dev-', 'ais-pre-');
  const pathname = window.location.pathname.replace(/\/+$/, '') || '';
  return `${origin}${pathname}/?game=${encodeURIComponent(gameCode.toUpperCase())}`;
}

/**
 * Detects if the app is currently running in an AI Studio internal development container.
 * In development containers (ais-dev-...), external Google users encounter 403 Forbidden
 * until the workspace owner publishes/shares the app via the AI Studio Share button.
 */
export function isAiStudioDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('ais-dev-');
}

/**
 * Robust copy helper supporting modern Clipboard API with fallback to execCommand('copy')
 * for iframes or environments where navigator.clipboard permissions may be restricted.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Method 1: Modern Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Method 2: Fallback textarea execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}

