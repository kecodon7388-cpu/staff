import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Device from 'expo-device';
import { api, setUnauthorizedHandler } from './api';
import { getProfile, getToken, setProfile, setServer, setToken } from './storage';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, token: null, profile: null });

  useEffect(() => {
    (async () => {
      const [token, profile] = await Promise.all([getToken(), getProfile()]);
      setState({ loading: false, token, profile });
    })();
  }, []);

  const signOutLocal = useCallback(async () => {
    await setToken(null);
    await setProfile(null);
    setState({ loading: false, token: null, profile: null });
  }, []);

  useEffect(() => { setUnauthorizedHandler(() => { signOutLocal(); }); }, [signOutLocal]);

  const signIn = useCallback(async (server, username, password) => {
    const device = [Device.manufacturer, Device.modelName, Device.osName, Device.osVersion].filter(Boolean).join(' ') || 'Thiết bị di động';
    const res = await api.login(server, username.trim(), password, device);
    await setServer(server);
    await setToken(res.token);
    await setProfile(res.profile);
    setState({ loading: false, token: res.token, profile: res.profile });
  }, []);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* vẫn đăng xuất trên máy */ }
    await signOutLocal();
  }, [signOutLocal]);

  const updateProfile = useCallback(async (profile) => {
    if (!profile) return;
    await setProfile(profile);
    setState((s) => ({ ...s, profile }));
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut, updateProfile }), [state, signIn, signOut, updateProfile]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
