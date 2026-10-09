import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const TOKEN = 'ce_shop_token';
const SERVER = 'ce_shop_server';
const PROFILE = 'ce_shop_profile';

export const defaultServer = Constants.expoConfig?.extra?.defaultServerUrl || 'http://192.168.1.10:5180';

export async function getToken() { try { return await SecureStore.getItemAsync(TOKEN); } catch { return null; } }
export async function setToken(t) {
  if (t) await SecureStore.setItemAsync(TOKEN, t);
  else await SecureStore.deleteItemAsync(TOKEN).catch(() => {});
}

export async function getServer() {
  try { return (await AsyncStorage.getItem(SERVER)) || defaultServer; } catch { return defaultServer; }
}
export async function setServer(url) { await AsyncStorage.setItem(SERVER, url.trim().replace(/\/+$/, '')); }

export async function getProfile() { try { return JSON.parse((await AsyncStorage.getItem(PROFILE)) || 'null'); } catch { return null; } }
export async function setProfile(p) { if (p) await AsyncStorage.setItem(PROFILE, JSON.stringify(p)); else await AsyncStorage.removeItem(PROFILE); }
