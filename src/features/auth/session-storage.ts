import type { SupportedStorage } from '@supabase/supabase-js';

// A storage failure must be visible: never silently claim a persistent login.
export const authSessionStorage: SupportedStorage = {
  getItem: (key) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};
