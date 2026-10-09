/**
 * Quét mã vạch / QR liên tục bằng expo-camera (CameraView).
 *  - Bỏ qua cùng một mã trong 2,5 giây (debounce) để không gửi trùng.
 *  - onCode(code) có thể trả về Promise<{ ok, message }> → rung + viền xanh/đỏ + dòng thông báo.
 *  - Mã trên tem có thể là link tra cứu → lấy phần cuối sau dấu "/".
 * ScanModal: mở toàn màn hình để quét 1 mã (single) hoặc quét nhiều mã liên tục.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { hapticErr, hapticOk } from '../hooks';
import { Button } from './ui';

export const DEBOUNCE_MS = 2500;
export const BARCODE_TYPES = ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'datamatrix', 'pdf417'];

/** Chuẩn hóa mã quét được */
export const cleanCode = (raw) => String(raw || '').trim().split('/').pop().split('?')[0].trim().toUpperCase();

export function ScannerView({ onCode, height = 260, paused, hint = 'Đưa mã vạch / QR vào khung', style }) {
  const [perm, requestPerm] = useCameraPermissions();
  const focused = useIsFocused();
  const [torch, setTorch] = useState(false);
  const [flash, setFlash] = useState(null); // { ok, message, code }
  const [busy, setBusy] = useState(false);
  const last = useRef({});
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = async ({ data }) => {
    const code = cleanCode(data);
    if (!code || paused) return;
    const now = Date.now();
    if (last.current[code] && now - last.current[code] < DEBOUNCE_MS) return;
    last.current[code] = now;
    setBusy(true);
    let res;
    try { res = await onCode(code); } catch (e) { res = { ok: false, message: e.message }; }
    setBusy(false);
    const ok = res ? res.ok !== false : true;
    if (ok) hapticOk(); else hapticErr();
    setFlash({ ok, code, message: res?.message || (ok ? 'Đã nhận mã' : 'Lỗi') });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 2200);
  };

  if (!perm) return <View style={[styles.box, { height }, style]} />;
  if (!perm.granted) {
    return (
      <View style={[styles.box, styles.center, { height }, style]}>
        <Ionicons name="camera-outline" size={40} color="#94A3B8" />
        <Text style={styles.permText}>Cần quyền camera để quét mã vận đơn</Text>
        <Button title="Cho phép camera" icon="camera" size="md" onPress={requestPerm} style={{ marginTop: 12, paddingHorizontal: 20 }} />
      </View>
    );
  }

  const border = flash ? (flash.ok ? colors.success : colors.danger) : 'transparent';
  return (
    <View style={[styles.box, { height, borderColor: border }, style]}>
      {focused ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={paused ? undefined : handle} />
      ) : null}
      <View style={styles.frame} pointerEvents="none">
        <View style={[styles.corner, { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3 }]} />
        <View style={[styles.corner, { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3 }]} />
        <View style={[styles.corner, { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3 }]} />
        <View style={[styles.corner, { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3 }]} />
        <View style={styles.laser} />
      </View>
      <Pressable onPress={() => setTorch(!torch)} style={styles.torch} hitSlop={6}>
        <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={18} color="#fff" />
      </Pressable>
      <View style={[styles.msg, flash && { backgroundColor: flash.ok ? 'rgba(22,163,74,0.92)' : 'rgba(220,38,38,0.92)' }]} pointerEvents="none">
        {busy ? <ActivityIndicator color="#fff" size="small" /> : flash ? <Ionicons name={flash.ok ? 'checkmark-circle' : 'close-circle'} size={16} color="#fff" /> : null}
        <Text style={styles.msgText} numberOfLines={2}>{flash ? `${flash.code} · ${flash.message}` : paused ? 'Tạm dừng quét' : hint}</Text>
      </View>
    </View>
  );
}

/** Ô nhập mã thủ công */
export function ManualCode({ onSubmit, placeholder = 'Nhập mã vận đơn', dark, busy }) {
  const [v, setV] = useState('');
  const go = () => { const c = cleanCode(v); if (c) { onSubmit(c); setV(''); } };
  return (
    <View style={[styles.manual, dark && { backgroundColor: 'rgba(15,23,42,0.85)', borderColor: 'transparent' }]}>
      <TextInput value={v} onChangeText={setV} placeholder={placeholder} placeholderTextColor="#94A3B8" autoCapitalize="characters"
        autoCorrect={false} style={[styles.manualInput, dark && { color: '#fff' }]} returnKeyType="done" onSubmitEditing={go} blurOnSubmit={false} />
      <Pressable onPress={go} style={styles.go}>
        {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={22} color="#fff" />}
      </Pressable>
    </View>
  );
}

/**
 * ScanModal toàn màn hình.
 * single = true: quét được 1 mã thì gọi onCode(code) và đóng.
 * single = false: quét liên tục, onCode(code) trả về { ok, message }; hiện danh sách mã đã quét.
 */
export function ScanModal({ visible, title = 'Quét mã vận đơn', onClose, onCode, single = true }) {
  const insets = useSafeAreaInsets();
  const [log, setLog] = useState([]);
  useEffect(() => { if (visible) setLog([]); }, [visible]);

  const handle = async (code) => {
    if (single) { onClose && onClose(); setTimeout(() => onCode(code), 50); return { ok: true, message: 'Đã quét' }; }
    let r;
    try { r = (await onCode(code)) || { ok: true, message: 'Đã thêm' }; } catch (e) { r = { ok: false, message: e.message }; }
    setLog((l) => [{ code, ...r, t: Date.now() }, ...l].slice(0, 50));
    return r;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={[styles.mHead, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.mTitle}>{title}</Text>
          <Pressable onPress={onClose} style={styles.mClose} hitSlop={8}><Ionicons name="close" size={24} color="#fff" /></Pressable>
        </View>
        <ScannerView onCode={handle} height={single ? 420 : 320} style={{ marginHorizontal: 12, borderRadius: 20 }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 12, paddingBottom: insets.bottom + 12 }}>
          {!single ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.logHead}>Đã quét {log.length} mã</Text>
              {log.slice(0, 8).map((x) => (
                <View key={x.t + x.code} style={styles.logRow}>
                  <Ionicons name={x.ok ? 'checkmark-circle' : 'close-circle'} size={16} color={x.ok ? '#4ADE80' : '#F87171'} />
                  <Text style={styles.logCode}>{x.code}</Text>
                  <Text style={styles.logMsg} numberOfLines={1}>{x.message}</Text>
                </View>
              ))}
            </View>
          ) : <View style={{ flex: 1 }} />}
          <ManualCode dark onSubmit={handle} />
          {!single ? <Button title="Xong" icon="checkmark" variant="primary" onPress={onClose} style={{ marginTop: 10 }} /> : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#0B1220', borderWidth: 4, borderColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 20, borderColor: '#1E293B' },
  permText: { color: '#CBD5E1', marginTop: 8, textAlign: 'center' },
  frame: { position: 'absolute', top: '18%', bottom: '24%', left: '14%', right: '14%' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: '#fff', borderRadius: 4 },
  laser: { position: 'absolute', left: 12, right: 12, top: '50%', height: 2, backgroundColor: 'rgba(248,113,113,0.85)' },
  torch: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  msg: { position: 'absolute', left: 10, right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  msgText: { color: '#fff', fontWeight: '600', fontSize: 13.5, flex: 1 },
  manual: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 5, borderWidth: 1, borderColor: colors.borderStrong },
  manualInput: { flex: 1, color: colors.text, fontSize: 16, paddingHorizontal: 12, height: 44, fontWeight: '600', letterSpacing: 0.5 },
  go: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  mTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  mClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  logHead: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 6 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  logCode: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  logMsg: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, flex: 1 },
});
