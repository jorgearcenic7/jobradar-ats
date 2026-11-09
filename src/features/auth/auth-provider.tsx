import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { getAuthClient } from './client';

type AuthState = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
};
const AuthContext = createContext<AuthState>({
  session: null,
  loading: false,
  configured: false,
  error: null,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [client] = useState(getAuthClient);
  const [state, setState] = useState<AuthState>({
    session: null,
    loading: Boolean(client),
    configured: Boolean(client),
    error: null,
  });
  useEffect(() => {
    if (!client) return;
    let active = true;
    let changed = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) setState({ session, loading: false, configured: true, error: null });
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && (!changed || error))
          setState({
            session: data.session,
            loading: false,
            configured: true,
            error: error ? 'No se pudo restaurar la sesión. Vuelve a iniciar sesión.' : null,
          });
      })
      .catch(() => {
        if (active)
          setState({
            session: null,
            loading: false,
            configured: true,
            error:
              'No se pudo acceder al almacenamiento de sesión. Permite el almacenamiento del navegador y vuelve a cargar.',
          });
      });
    const refresh = (status: string | null | undefined) => {
      if (status === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    const appState = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    return () => {
      active = false;
      subscription.unsubscribe();
      appState?.remove();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    };
  }, [client]);
  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
