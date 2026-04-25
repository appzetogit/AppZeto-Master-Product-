/**
 * Detect if the app is running inside a Flutter WebView vs. a real browser.
 *
 * Architecture:
 *  - Flutter app: directly calls /api/v1/users/fcm-token or /api/v1/partners/fcm-token
 *    with platform='app' from native Dart code. The React frontend does NOTHING
 *    for FCM in the WebView — it skips all web push registration.
 *  - Real browser: React frontend requests web push permission and calls the
 *    same endpoints with platform='web'.
 *
 * Detection strategy:
 *  1. sessionStorage flag (set from ?source=app URL param on first load).
 *     sessionStorage is safe — it's isolated per-tab and cleared when closed,
 *     unlike localStorage which is shared and would poison browser sessions.
 *  2. Android WebView User-Agent pattern (contains "wv" flag).
 *  3. Android WebView alternate UA (Android + Version/x but no Chrome).
 *  4. iOS WebView (AppleWebKit without Safari label).
 *
 * Call initAppMode() once at app startup BEFORE any isWebView() calls.
 */

const SESSION_KEY = '__rukkoo_webview__';

/**
 * Call once at startup. Reads ?source=app from URL and caches it in sessionStorage
 * so isWebView() works correctly after SPA navigation changes the URL.
 */
export const initAppMode = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') === 'app') {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  } catch (_) { /* ignore SSR/restricted environments */ }
};

/**
 * Returns true if running inside the Flutter WebView app.
 * Safe to call multiple times — reads from sessionStorage after initAppMode().
 */
export const isWebView = () => {
  try {
    // 1. Session flag — set on first load if ?source=app was in the URL
    //    This handles SPA navigation where the URL param disappears after first route.
    if (sessionStorage.getItem(SESSION_KEY) === '1') return true;

    // 2. URL param still present (e.g. first render before SPA router takes over)
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') === 'app') return true;
  } catch (_) { /* ignore */ }

  const ua = navigator.userAgent || '';

  // 3. Android WebView: UA contains "wv" flag (most reliable Android signal)
  const isAndroidWebView = /Android/.test(ua) && /wv/.test(ua);

  // 4. Android WebView alternate: Android + Version/x.x but no Chrome branding
  const isAndroidWebViewAlt = /Android/.test(ua) && /Version\/\d/.test(ua) && !/Chrome/.test(ua);

  // 5. iOS WebView: AppleWebKit present but "Safari" label absent
  //    Real Safari/Chrome-iOS always include "Safari/" — WebViews don't.
  const isIOSWebView = /(iPhone|iPad|iPod)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari/.test(ua);

  return isAndroidWebView || isAndroidWebViewAlt || isIOSWebView;
};
