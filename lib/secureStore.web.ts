/**
 * Web-compatible replacement for expo-secure-store
 * Uses localStorage on web platform
 */

export async function getItemAsync(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}
