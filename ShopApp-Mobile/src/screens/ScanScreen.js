import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors } from '../theme';
import { Button, hapticError, hapticSuccess } from '../components/ui';

/** QR trên tem có thể là link tra cứu (…/tra-cuu/CE123) → lấy đoạn cuối, bỏ query string */
const extractCode = (raw) => {
  let s = String(raw || '').trim();
  if (/^https?:\/\//i.test(s) || s.includes('/')) {
    s = s.split('#')[0];
    const q = s.indexOf('?');
    if (q >= 0) {
      const m = s.slice(q + 1).match(/(?:^|&)(?:code|ma|q|trackingCode)=([^&]+)/i);
      if (m) return decodeURIComponent(m[1]).trim();
      s = s.slice(0, q);
    }
    s = s.replace(/\/+$/, '').split('/').pop() || '';
  }
  try { s = decodeURIComponent(s); } catch { /* giữ nguyên */ }
  return s.trim();
};

export default function ScanScreen({ navigation, route }) {
  const pick = !!route.params?.pick;
  const returnTo = route.params?.returnTo || 'CreateComplaint';
  const [perm, requestPerm] = useCameraPermissions();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [torch, setTorch] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const lock = useRef(false);

  const handle = async (raw) => {
    const c = extractCode(raw);
    if (!c || lock.current) return;
    lock.current = true; setMsg('');
    if (pick) {
      hapticSuccess();
      navigation.navigate({ name: returnTo, params: { scannedCode: c, ts: Date.now() }, merge: true });
      return;
    }
    setBusy(true);
    try {
      const res = await api.orderByCode(c);
      hapticSuccess();
      setCode('');
      navigation.replace('OrderDetail', { id: res.data.id });
    } catch (e) {
      hapticError();
      setMsg(e.message);
      setTimeout(() => { lock.current = false; }, 1500);
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Pressable onPress={() => navigation.goBack()} style={styles.roundBtn} hitSlop={6}>
      <Ionicons name="chevron-back" size={22} color="#fff" />
    </Pressable>
  );

  if (!perm) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  if (!perm.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Pressable onPress={() => navigation.goBack()} style={[styles.backDark, { top: insets.top + 10 }]} hitSlop={6}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Ionicons name="camera-outline" size={56} color={colors.faint} />
        <Text style={styles.permTitle}>Cần quyền truy cập camera</Text>
        <Text style={styles.permText}>Để quét mã vạch / QR trên tem vận đơn</Text>
        <Button title="Cho phép camera" icon="camera" onPress={requestPerm} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        <View style={[styles.manual, { marginTop: 24, alignSelf: 'stretch', backgroundColor: colors.navy }]}>
          <TextInput value={code} onChangeText={setCode} placeholder="Hoặc nhập mã vận đơn" placeholderTextColor="#94A3B8" autoCapitalize="characters"
            autoCorrect={false} style={styles.input} returnKeyType="search" onSubmitEditing={() => handle(code)} />
          <Pressable onPress={() => handle(code)} style={styles.go}>
            {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </Pressable>
        </View>
        {msg ? <Text style={[styles.err, { marginTop: 12, alignSelf: 'stretch' }]}>{msg}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      {focused ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
          onBarcodeScanned={busy ? undefined : ({ data }) => handle(data)} />
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {back}
        <Text style={styles.topTitle}>{pick ? 'Quét mã cho khiếu nại' : 'Tra cứu vận đơn'}</Text>
        <Pressable onPress={() => setTorch(!torch)} style={styles.roundBtn}>
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, { top: -2, left: -2, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 18 }]} />
          <View style={[styles.corner, { top: -2, right: -2, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 18 }]} />
          <View style={[styles.corner, { bottom: -2, left: -2, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 18 }]} />
          <View style={[styles.corner, { bottom: -2, right: -2, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 18 }]} />
        </View>
        <Text style={styles.hint}>{busy ? 'Đang tìm đơn...' : 'Đưa mã vạch hoặc QR vào khung'}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {msg ? <Text style={styles.err}>{msg}</Text> : null}
        <View style={styles.manual}>
          <TextInput value={code} onChangeText={setCode} placeholder="Hoặc nhập mã vận đơn / mã đơn shop" placeholderTextColor="#94A3B8" autoCapitalize="characters"
            autoCorrect={false} style={styles.input} returnKeyType="search" onSubmitEditing={() => handle(code)} />
          <Pressable onPress={() => handle(code)} style={styles.go}>
            {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward" size={20} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const FRAME = 260;
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.bg },
  backDark: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: '#E9EDF4', alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 14 },
  permText: { fontSize: 14, color: colors.muted, marginTop: 6 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 10 },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME, height: FRAME, borderRadius: 18, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 46, height: 46, borderColor: colors.brand100 },
  hint: { color: '#fff', marginTop: 22, fontSize: 14.5, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  err: { color: '#fff', backgroundColor: 'rgba(220,38,38,0.9)', padding: 10, borderRadius: 10, marginBottom: 10, textAlign: 'center', overflow: 'hidden' },
  manual: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 16, padding: 6 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingHorizontal: 12, height: 46 },
  go: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
