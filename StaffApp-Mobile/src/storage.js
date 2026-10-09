import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN = 'ce_token';
const SERVER = 'ce_server';
const PROFILE = 'ce_profile';

// Cho phép đọc token khi app chạy nền (gửi GPS) sau lần mở khóa máy đầu tiên
const secureOpts = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

export const defaultServer = Constants.expoConfig?.extra?.defaultServerUrl || 'http://192.168.1.10:5180';

export async function getToken() { try { return await SecureStore.getItemAsync(TOKEN, secureOpts); } catch { return null; } }
export async function setToken(t) {
  if (t) await SecureStore.setItemAsync(TOKEN, t, secureOpts);
  else await SecureStore.deleteItemAsync(TOKEN, secureOpts).catch(() => {});
}

export async function getServer() { return (await AsyncStorage.getItem(SERVER)) || defaultServer; }
export async function setServer(url) { await AsyncStorage.setItem(SERVER, url.trim().replace(/\/+$/, '')); }

export async function getProfile() { try { return JSON.parse((await AsyncStorage.getItem(PROFILE)) || 'null'); } catch { return null; } }
export async function setProfile(p) { if (p) await AsyncStorage.setItem(PROFILE, JSON.stringify(p)); else await AsyncStorage.removeItem(PROFILE); }

export const kv = {
  get: async (k, def = null) => { try { const v = await AsyncStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set: (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => AsyncStorage.removeItem(k),
};
