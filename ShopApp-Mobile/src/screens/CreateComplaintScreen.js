import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { getLookups } from '../lookups';
import { pickPhotos } from '../photos';
import { colors, font } from '../theme';
import { moneyInput, parseMoney } from '../format';
import { Button, Card, Chip, ChipWrap, ErrorBanner, Field, SectionTitle, hapticError, hapticSuccess } from '../components/ui';

const MAX = 5;

export default function CreateComplaintScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [types, setTypes] = useState([]);
  const [typesErr, setTypesErr] = useState('');
  const [trackingCode, setTrackingCode] = useState(route.params?.trackingCode || '');
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadTypes = () => {
    setTypesErr('');
    getLookups().then((l) => setTypes(l.complaintTypes || [])).catch((e) => setTypesErr(e.message));
  };
  useEffect(loadTypes, []);

  // Mã quét được từ màn hình Quét mã (navigate merge params)
  useEffect(() => {
    if (route.params?.scannedCode) setTrackingCode(route.params.scannedCode);
  }, [route.params?.scannedCode, route.params?.ts]);

  const addPhotos = async () => {
    const uris = await pickPhotos(MAX - photos.length);
    if (uris.length) setPhotos([...photos, ...uris].slice(0, MAX));
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) { hapticError(); Alert.alert('Thiếu thông tin', 'Nhập tiêu đề và nội dung khiếu nại.'); return; }
    setBusy(true);
    try {
      const r = await api.createComplaint({
        trackingCode: trackingCode.trim(), type: type || 'Other', title: title.trim(), description: description.trim(),
        requestedAmount: parseMoney(amount), photos,
      });
      hapticSuccess();
      const warn = r.warnings?.length ? '\n\nMột số tệp lỗi: ' + r.warnings.join('; ') : '';
      navigation.replace('ComplaintDetail', { id: r.data.id });
      Alert.alert('Đã gửi khiếu nại', (r.message || 'Đã gửi khiếu nại') + warn);
    } catch (e) { hapticError(); Alert.alert('Không gửi được', e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label="Mã vận đơn" icon="cube-outline" value={trackingCode} onChangeText={setTrackingCode} autoCapitalize="characters" autoCorrect={false}
            placeholder="Để trống nếu khiếu nại chung"
            right={(
              <Pressable onPress={() => navigation.navigate('Scan', { pick: true, returnTo: 'CreateComplaint' })} hitSlop={8} style={styles.scanBtn}>
                <Ionicons name="scan" size={20} color={colors.brand600} />
              </Pressable>
            )} />

          <Text style={styles.label}>Loại khiếu nại</Text>
          <ErrorBanner message={typesErr} onRetry={loadTypes} style={{ marginBottom: 10 }} />
          <ChipWrap style={{ marginBottom: 16 }}>
            {types.map((t) => <Chip key={t.code} label={t.text} active={type === t.code} onPress={() => setType(t.code)} />)}
          </ChipWrap>

          <Field label="Tiêu đề" required value={title} onChangeText={setTitle} placeholder="VD: Hàng bị móp hộp khi nhận" maxLength={200} />
          <Field label="Nội dung chi tiết" required value={description} onChangeText={setDescription} multiline
            placeholder="Mô tả sự việc, thời gian, tình trạng hàng..." inputStyle={{ minHeight: 120 }} />
          <Field label="Số tiền yêu cầu bồi thường" icon="cash-outline" value={amount} onChangeText={(v) => setAmount(moneyInput(v))}
            keyboardType="number-pad" placeholder="0" right={<Text style={styles.unit}>đ</Text>} style={{ marginBottom: 0 }} />
        </Card>

        <SectionTitle title={`Ảnh minh chứng (${photos.length}/${MAX})`} />
        <View style={styles.photos}>
          {photos.map((u, i) => (
            <View key={u + i}>
              <Image source={{ uri: u }} style={styles.photo} />
              <Pressable onPress={() => setPhotos(photos.filter((_, j) => j !== i))} style={styles.remove} hitSlop={6}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX ? (
            <Pressable onPress={addPhotos} style={[styles.photo, styles.add]}>
              <Ionicons name="camera-outline" size={26} color={colors.brand600} />
              <Text style={{ fontSize: 12, color: colors.brand600, fontWeight: '600', marginTop: 4 }}>Thêm ảnh</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={[font.small, { marginTop: 8 }]}>Ảnh rõ nét về hàng hóa, bao bì, tem vận đơn giúp xử lý nhanh hơn.</Text>

        <Button title="Gửi khiếu nại" icon="send" onPress={submit} loading={busy} style={{ marginTop: 22 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 8 },
  unit: { paddingHorizontal: 14, color: colors.muted, fontWeight: '700' },
  scanBtn: { paddingHorizontal: 14, height: 48, justifyContent: 'center' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 96, height: 96, borderRadius: 14, backgroundColor: '#E2E8F0' },
  add: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand50, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.brand },
  remove: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});
