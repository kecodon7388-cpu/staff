/**
 * Tạo khiếu nại thay shop (multipart): trackingCode | customerId, type, title, description, requestedAmount, files.
 * Quyền: complaints.create hoặc complaints.manage. Chọn shop (khi không có mã đơn) cần cod.view/cod.manage/customers.view (fin/customers).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { hapticOk } from '../../hooks';
import { colors } from '../../theme';
import { digits, money } from '../../format';
import { Button, Card, Chips, Field, MoneyField, Segmented } from '../../components/ui';
import PickField from '../../components/PickField';
import { ScanModal, cleanCode } from '../../components/Scanner';
import { pickPhotos } from './ComplaintDetailScreen';

export const COMPLAINT_TYPES = [
  { key: 'Lost', label: 'Mất hàng' }, { key: 'Damaged', label: 'Hư hỏng' }, { key: 'Missing', label: 'Thiếu hàng' }, { key: 'WrongItem', label: 'Sai hàng' },
  { key: 'WrongDelivery', label: 'Giao sai' }, { key: 'CodMismatch', label: 'COD sai lệch' }, { key: 'Other', label: 'Khác' },
];

export default function ComplaintCreateScreen({ navigation, route }) {
  const { canAny } = useAuth();
  const canPickShop = canAny('cod.view', 'cod.manage', 'customers.view');
  const [mode, setMode] = useState('order');
  const [code, setCode] = useState(route.params?.trackingCode || '');
  const [order, setOrder] = useState(null);
  const [cust, setCust] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [type, setType] = useState('Damaged');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [photos, setPhotos] = useState([]);
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async (raw) => {
    const c = cleanCode(raw);
    if (!c) return;
    setCode(c);
    try { const r = await staff.orderByCode(c); setOrder(r.data); } catch (e) { setOrder(null); Alert.alert('Không tìm thấy đơn', e.message); }
  }, []);
  useEffect(() => { if (route.params?.trackingCode) check(route.params.trackingCode); }, [route.params?.trackingCode, check]);

  const searchCust = useCallback(async (q) => {
    try { setCustomers((await staff.finCustomers(q)).items || []); } catch { setCustomers([]); }
  }, []);
  useEffect(() => { if (mode === 'shop' && canPickShop && customers == null) searchCust(''); }, [mode, canPickShop, customers, searchCust]);

  const addPhotos = async (cam) => { const u = await pickPhotos(cam); if (u.length) setPhotos((p) => [...p, ...u].slice(0, 10)); };

  const submit = async () => {
    const tc = mode === 'order' ? cleanCode(code) : '';
    if (mode === 'order' && !tc) return Alert.alert('Thiếu mã vận đơn', 'Quét hoặc nhập mã vận đơn');
    if (mode === 'shop' && !cust) return Alert.alert('Thiếu shop', 'Chọn shop khiếu nại');
    if (!title.trim() || !desc.trim()) return Alert.alert('Thiếu nội dung', 'Nhập tiêu đề và nội dung khiếu nại');
    setBusy(true);
    try {
      const r = await staff.createComplaint({
        trackingCode: tc || null, customerId: mode === 'shop' ? cust.id : null, type,
        title: title.trim(), description: desc.trim(), requestedAmount: Number(digits(amount) || 0), photos,
      });
      hapticOk();
      if (r.warnings?.length) Alert.alert('Đã tạo, một số ảnh lỗi', r.warnings.join('\n'));
      navigation.replace('ComplaintDetail', { id: r.data.id });
    } catch (e) { Alert.alert('Không tạo được', e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {canPickShop ? (
        <Segmented value={mode} onChange={setMode} items={[{ key: 'order', label: 'Theo vận đơn' }, { key: 'shop', label: 'Theo shop' }]} />
      ) : null}
      <Card style={{ marginTop: canPickShop ? 12 : 0, paddingBottom: 4 }}>
        {mode === 'order' ? (
          <>
            <Field label="Mã vận đơn" icon="barcode-outline" value={code} onChangeText={(t) => { setCode(t); setOrder(null); }} autoCapitalize="characters" autoCorrect={false}
              placeholder="Quét hoặc nhập mã" onSubmitEditing={() => check(code)} returnKeyType="search"
              right={<Pressable onPress={() => setScan(true)} style={styles.scan}><Ionicons name="scan" size={20} color={colors.brand} /></Pressable>} />
            {order ? (
              <View style={styles.order}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.oCode}>{order.trackingCode} · {order.statusText}</Text>
                  <Text style={styles.oSub}>{order.shop} · {order.receiver?.name} · khai giá {money(order.item?.declaredValue)}</Text>
                </View>
              </View>
            ) : code ? <Pressable onPress={() => check(code)}><Text style={styles.link}>Kiểm tra mã đơn</Text></Pressable> : null}
          </>
        ) : (
          <PickField label="Shop" title="Chọn shop" items={customers} value={cust?.id} onChange={setCust} icon="storefront-outline" loading={customers == null}
            onSearch={searchCust} getLabel={(c) => `${c.name} (${c.code})`} getSub={(c) => c.phone} getSearch={(c) => [c.name, c.code, c.phone].join(' ')} />
        )}
        <Text style={styles.label}>Loại khiếu nại</Text>
        <Chips items={COMPLAINT_TYPES} value={type} onChange={setType} style={{ marginBottom: 14 }} />
        <Field label="Tiêu đề" icon="create-outline" value={title} onChangeText={setTitle} placeholder="VD: Hàng bị móp hộp khi nhận" maxLength={200} />
        <Field label="Nội dung" icon="document-text-outline" value={desc} onChangeText={setDesc} multiline placeholder="Mô tả chi tiết sự việc, thời gian, người liên hệ..."
          inputStyle={{ minHeight: 90, textAlignVertical: 'top' }} />
        <MoneyField label="Số tiền shop yêu cầu bồi thường" value={amount} onChange={setAmount} placeholder="0" />
      </Card>

      <Text style={[styles.label, { marginTop: 16 }]}>Ảnh đính kèm ({photos.length}/10)</Text>
      <View style={styles.photos}>
        {photos.map((u) => (
          <Pressable key={u} onPress={() => setPhotos((p) => p.filter((x) => x !== u))}>
            <Image source={{ uri: u }} style={styles.photo} />
            <View style={styles.pX}><Ionicons name="close" size={12} color="#fff" /></View>
          </Pressable>
        ))}
        {photos.length < 10 ? (
          <>
            <Pressable onPress={() => addPhotos(true)} style={styles.addPhoto}><Ionicons name="camera-outline" size={24} color={colors.brand} /><Text style={styles.addText}>Chụp</Text></Pressable>
            <Pressable onPress={() => addPhotos(false)} style={styles.addPhoto}><Ionicons name="images-outline" size={24} color={colors.brand} /><Text style={styles.addText}>Thư viện</Text></Pressable>
          </>
        ) : null}
      </View>

      <Button title="Tạo khiếu nại" icon="send" loading={busy} onPress={submit} style={{ marginTop: 20 }} />
      <ScanModal visible={scan} onClose={() => setScan(false)} onCode={check} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scan: { paddingHorizontal: 14, height: 48, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
  order: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.successBg, borderRadius: 10, padding: 10, marginTop: -4, marginBottom: 14 },
  oCode: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  oSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  link: { color: colors.brand, fontWeight: '600', marginTop: -6, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 78, height: 78, borderRadius: 12 },
  pX: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  addPhoto: { width: 78, height: 78, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#BFD0F5', backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center', gap: 2 },
  addText: { fontSize: 11.5, color: colors.brand600, fontWeight: '600' },
});
