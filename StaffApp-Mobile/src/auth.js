import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Device from 'expo-device';
import { setUnauthorizedHandler, staff } from './api';
import { getProfile, getToken, setProfile, setServer, setToken } from './storage';
import { resumeTracking, stopTracking } from './location';
import { clearLookups } from './lookups';

const AuthCtx = createContext(null);

/** Các quyền cho phép tra cứu / xem chi tiết vận đơn (khớp OrderReaders trong StaffApiController) */
export const ORDER_READERS = ['orders.view', 'warehouse.ops', 'dispatch.manage', 'cod.manage', 'complaints.view', 'complaints.manage', 'returns.manage'];

/** Bật/tắt GPS theo phân hệ: chỉ tài khoản có module "shipper" mới được gửi vị trí */
async function syncTracking(profile) {
  const isShipper = (profile?.modules || []).includes('shipper');
  try {
    if (isShipper) await resumeTracking(); // giữ hành vi cũ: chỉ chạy lại nếu shipper đã bật "Đang làm việc"
    else await stopTracking();
  } catch { /* bỏ qua lỗi quyền vị trí */ }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, token: null, profile: null });
  const [me, setMe] = useState(null); // { stats, unreadNotifications, company } từ GET /api/staff/me
  const tokenRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [token, profile] = await Promise.all([getToken(), getProfile()]);
      // Hồ sơ cũ (VD còn sót từ App CE Shipper) không có modules → buộc đăng nhập lại
      const valid = token && profile && Array.isArray(profile.modules);
      tokenRef.current = valid ? token : null;
      setState({ loading: false, token: valid ? token : null, profile: valid ? profile : null });
      if (valid) syncTracking(profile);
    })();
  }, []);

  const signOutLocal = useCallback(async () => {
    await stopTracking().catch(() => {});
    await setToken(null);
    await setProfile(null);
    clearLookups();
    tokenRef.current = null;
    setMe(null);
    setState({ loading: false, token: null, profile: null });
  }, []);

  useEffect(() => { setUnauthorizedHandler(() => { if (tokenRef.current) signOutLocal(); }); }, [signOutLocal]);

  const signIn = useCallback(async (server, username, password) => {
    const device = [Device.manufacturer, Device.modelName, Device.osName, Device.osVersion].filter(Boolean).join(' ');
    const res = await staff.login(server, username.trim(), password, device || 'CE Staff');
    await setServer(server);
    await setToken(res.token);
    await setProfile(res.profile);
    tokenRef.current = res.token;
    setMe(null);
    setState({ loading: false, token: res.token, profile: res.profile });
    syncTracking(res.profile);
  }, []);

  const signOut = useCallback(async () => {
    try { await staff.logout(); } catch { /* vẫn đăng xuất trên máy */ }
    await signOutLocal();
  }, [signOutLocal]);

  /** Tải lại hồ sơ + số liệu nhanh theo phân hệ. Trả về phản hồi /me. */
  const refreshMe = useCallback(async () => {
    const r = await staff.me();
    if (r.profile) {
      await setProfile(r.profile);
      setState((s) => ({ ...s, profile: r.profile }));
    }
    setMe({ stats: r.stats || {}, unreadNotifications: r.unreadNotifications || 0, company: r.company || null });
    return r;
  }, []);

  const setUnread = useCallback((n) => setMe((m) => (m ? { ...m, unreadNotifications: n } : m)), []);

  const value = useMemo(() => {
    const profile = state.profile;
    const modules = profile?.modules || [];
    const perms = profile?.permissions || [];
    const all = perms.includes('*');
    const can = (p) => all || perms.includes(p);
    const canAny = (...ps) => ps.flat().some(can);
    return {
      ...state, me, modules, permissions: perms,
      has: (m) => modules.includes(m),
      can, canAny,
      canReadOrders: canAny(ORDER_READERS),
      signIn, signOut, logout: signOut, refreshMe, setUnread,
    };
  }, [state, me, signIn, signOut, refreshMe, setUnread]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
