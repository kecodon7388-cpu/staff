/** Tạo bảng kê – đúng DTO WhManifestRequest: type (Transfer | ShipperHandover), fromWarehouseId, toWarehouseId, shipperId, note */
import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { staff } from '../../api';
import { hapticOk } from '../../hooks';
import { colors } from '../../theme';
import { Button, Card, Field, Segmented } from '../../components/ui';
import { Hint, ShipperField, WarehouseField } from '../../components/PickField';

export default function WhManifestCreateScreen({ navigation }) {
  const [type, setType] = useState('Transfer');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [sp, setSp] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!from) return Alert.alert('Thiếu thông tin', 'Chọn kho xuất');
    if (type === 'Transfer' && (!to || to.id === from.id)) return Alert.alert('Thiếu thông tin', 'Chọn kho đích khác kho xuất');
    if (type === 'ShipperHandover' && !sp) return Alert.alert('Thiếu thông tin', 'Chọn shipper nhận bàn giao');
    setBusy(true);
    try {
      const r = await staff.whCreateManifest({
        type, fromWarehouseId: from.id,
        toWarehouseId: type === 'Transfer' ? to.id : null,
        shipperId: type === 'ShipperHandover' ? sp.id : null,
        note: note.trim() || null,
      });
      hapticOk();
      navigation.replace('WhManifestDetail', { id: r.data.id });
    } catch (e) { Alert.alert('Không tạo được', e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Segmented value={type} onChange={setType} items={[{ key: 'Transfer', label: 'Trung chuyển' }, { key: 'ShipperHandover', label: 'Bàn giao shipper' }]} />
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 10, marginBottom: 14 }}>
        {type === 'Transfer' ? 'Gom đơn chuyển từ kho này sang kho / hub khác. Kho đích quét nhận khi xe đến.' : 'Gom đơn đã phân công cho 1 shipper để bàn giao đi giao một lần.'}
      </Text>
      <Card style={{ paddingBottom: 4 }}>
        <WarehouseField label="Kho xuất" value={from?.id} onChange={setFrom} remember="manifest_from" />
        {type === 'Transfer' ? (
          <WarehouseField label="Kho đích" value={to?.id} onChange={setTo} exclude={from?.id} />
        ) : (
          <>
            <ShipperField label="Shipper nhận bàn giao" value={sp?.id} onChange={setSp} />
            <Hint>Chỉ thêm được đơn đã phân công giao cho shipper này.</Hint>
          </>
        )}
        <Field label="Ghi chú" icon="document-text-outline" value={note} onChangeText={setNote} placeholder="VD: xe tải 51C-123.45, chuyến 14h" />
      </Card>
      <Button title="Tạo bảng kê" icon="add-circle" loading={busy} onPress={submit} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}
