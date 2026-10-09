import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth';
import { getServer } from '../storage';
import { Button, Field } from '../components/ui';
import { colors } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServerUrl] = useState('');
  const [showServer, setShowServer] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getServer().then(setServerUrl); }, []);

  const submit = async () => {
    setError('');
    if (!username.trim() || !password) { setError('Nhập tên đăng nhập và mật khẩu'); return; }
    let url = server.trim();
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    setLoading(true);
    try { await signIn(url.replace(/\/+$/, ''), username, password); }
    catch (e) { setError(e.message); if (e.status === 0) setShowServer(true); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { paddingTop: insets.top + 36 }]}>
            <View style={styles.glow} />
            <View style={styles.logo}><Ionicons name="storefront" size={30} color="#fff" /></View>
            <Text style={styles.brand}>CE Shop</Text>
            <Text style={styles.tag}>Tạo đơn · Theo dõi · Đối soát COD</Text>
          </View>

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.sub}>Dùng tài khoản Cổng Shop do Courier Express cấp</Text>

            {error ? (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Field label="Tên đăng nhập" icon="person-outline" value={username} onChangeText={setUsername}
              autoCapitalize="none" autoCorrect={false} placeholder="VD: shopdemo" returnKeyType="next" textContentType="username" />
            <Field label="Mật khẩu" icon="lock-closed-outline" value={password} onChangeText={setPassword}
              secureTextEntry={!showPwd} placeholder="Nhập mật khẩu" returnKeyType="go" onSubmitEditing={submit} textContentType="password"
              right={(
                <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={10} style={{ paddingHorizontal: 14 }}>
                  <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.faint} />
                </Pressable>
              )} />

            <Button title="Đăng nhập" icon="arrow-forward" onPress={submit} loading={loading} style={{ marginTop: 6 }} />

            <Pressable onPress={() => setShowServer(!showServer)} style={styles.serverToggle}>
              <Ionicons name="server-outline" size={15} color={colors.muted} />
              <Text style={styles.serverText} numberOfLines={1}>Máy chủ: {server}</Text>
              <Ionicons name={showServer ? 'chevron-up' : 'chevron-down'} size={15} color={colors.muted} />
            </Pressable>
            {showServer ? (
              <Field icon="globe-outline" value={server} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false}
                keyboardType="url" placeholder="http://192.168.1.10:5180" style={{ marginTop: 6 }} />
            ) : null}
            <Text style={styles.foot}>Quên mật khẩu? Liên hệ CSKH Courier Express hoặc chủ shop để được cấp lại.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingBottom: 46, overflow: 'hidden' },
  glow: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: colors.brand, opacity: 0.35, top: -120, right: -120 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  brand: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  tag: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  sheet: { flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 28 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  sub: { fontSize: 14.5, color: colors.muted, marginTop: 4, marginBottom: 22 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { flex: 1, color: '#991B1B', fontSize: 14 },
  serverToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 22, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, backgroundColor: '#E9EDF4', maxWidth: '100%' },
  serverText: { fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  foot: { textAlign: 'center', color: colors.faint, fontSize: 12.5, marginTop: 18 },
});
