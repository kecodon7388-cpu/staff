import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api';
import { getLookups } from '../lookups';
import { colors } from '../theme';
import { Button, Card, ErrorBanner, Field, Loading, Segmented, ToggleRow, hapticError, hapticSuccess } from '../components/ui';
import LocationPicker from '../components/LocationPicker';

export default function AddressFormScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const a = route.params?.address;
  const [provinces, setProvinces] = useState(null);
  const [err, setErr] = useState('');
  const [type, setType] = useState(a?.type || route.params?.type || 'Pickup');
  const [label, setLabel] = useState(a?.label || '');
  const [contactName, setContactName] = useState(a?.contactName || '');
  const [phone, setPhone] = useState(a?.phone || '');
  const [addressLine, setAddressLine] = useState(a?.addressLine || '');
  const [loc, setLoc] = useState({ provinceId: a?.provinceId || null, districtId: a?.districtId || null, wardId: a?.wardId || null });
  const [isDefault, setIsDefault] = useState(!!a?.isDefault);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => { navigation.setOptions({ title: a ? 'Sửa địa chỉ' : 'Thêm địa chỉ' }); }, [navigation, a]);

  const load = () => { setErr(''); getLookups().then((l) => setProvinces(l.provinces)).catch((e) => setErr(e.message)); };
  useEffect(load, []);

  const save = async () => {
    if (!contactName.trim() || !phone.trim() || !addressLine.trim() || !loc.provinceId) {
      hapticError(); Alert.alert('Thiếu thông tin', 'Nhập đủ người liên hệ, số điện thoại, địa chỉ và tỉnh / thành.'); return;
    }
    setBusy(true);
    try {
      const r = await api.saveAddress({
        id: a?.id || 0, type, label: label.trim() || null, contactName: contactName.trim(), phone: phone.trim(), addressLine: addressLine.trim(),
        provinceId: loc.provinceId, districtId: loc.districtId || null, wardId: loc.wardId || null, isDefault,
      });
      hapticSuccess();
      navigation.goBack();
      if (r.message) setTimeout(() => Alert.alert('Thành công', r.message), 300);
    } catch (e) { hapticError(); Alert.alert('Không lưu được', e.message); } finally { setBusy(false); }
  };

  if (!provinces) return err ? <ErrorBanner message={err} onRetry={load} style={{ margin: 16 }} /> : <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 }}>Loại địa chỉ</Text>
        <Segmented items={[{ key: 'Pickup', label: 'Lấy hàng' }, { key: 'Return', label: 'Trả hàng hoàn' }]} value={type} onChange={setType} style={{ marginBottom: 14 }} />
        <Card>
          <Field label="Tên gợi nhớ" icon="bookmark-outline" value={label} onChangeText={setLabel} placeholder="VD: Kho Cầu Giấy" />
          <Field label="Người liên hệ" required icon="person-outline" value={contactName} onChangeText={setContactName} placeholder="Họ tên" />
          <Field label="Số điện thoại" required icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="09xx xxx xxx" />
          <Field label="Địa chỉ" required icon="home-outline" value={addressLine} onChangeText={setAddressLine} placeholder="Số nhà, tên đường..." />
          <LocationPicker provinces={provinces} value={loc} onChange={setLoc} required />
          <ToggleRow icon="star-outline" label="Đặt làm mặc định" value={isDefault} onValueChange={setIsDefault} last />
        </Card>
        <Button title="Lưu địa chỉ" icon="checkmark" onPress={save} loading={busy} style={{ marginTop: 18 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
