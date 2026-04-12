/**
 * Cached entitlement flag shared between the popup and the background
 * service worker. The popup writes this whenever it fetches entitlement;
 * the background reads it to decide whether Alt+Q should activate the
 * inspection panel on the current tab.
 */
const ACCESS_KEY = 'pinthat_access';

export async function setAccessAllowed(allowed: boolean): Promise<void> {
  await chrome.storage.local.set({ [ACCESS_KEY]: allowed });
}

export async function getAccessAllowed(): Promise<boolean> {
  const res = await chrome.storage.local.get(ACCESS_KEY);
  return res[ACCESS_KEY] === true;
}
