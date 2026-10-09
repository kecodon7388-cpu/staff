/**
 * Ghi nhận sự cố kho – DTO WhIncidentRequest: code, type (Lost | Damaged | Found), warehouseId, note.
 * Endpoint nhận JSON, KHÔNG nhận ảnh đính kèm → app không gửi ảnh (ghi chú mô tả thay thế).
 */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { confirmAsk, hapticOk } from '../../hooks';
import { caseColor, colors } from '../../theme';
import { Button, Card, Field } from '../../components/ui';
import { Hint, WarehouseField } from '../../components/PickField';
import { ScanModal, cleanCode } from '../../components/Scanner';
import { INCIDENT_TYPES } from './WhIncidentsScreen';

export default function WhIncidentCreateScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState('Lost');
  const [wh, setWh] = useState(null);
  const [note, setNote] = useState('');
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const c = cleanCode(code);
    if (!c) return Alert.alert('Thiếu mã vận đơn', 'Quét hoặc nhập mã vận đơn');
    if (!wh) return Alert.alert('Thiếu kho', 'Chọn kho ghi nhận');
    const t = INCIDENT_TYPES.find((x) => x.key === type);
    if (!(await confirmAsk('Ghi nhận sự cố', `Ghi nhận "${t.label}" cho đơn ${c} tại ${wh.name}?`, 'Ghi nhận', type === 'Lost'))) return;
    setBusy(true);
    try {
      const r = await staff.whCreateIncident({ code: c, type, warehouseId: wh.id, note: note.trim() || null });
      hapticOk();
      Alert.alert('Đã ghi nhận', r.message || '');
      navigation.goBack();
    } catch (e) { Alert.alert('Không ghi nhận được', e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card style={{ paddingBottom: 4 }}>
        <Field label="Mã vận đơn" icon="barcode-outline" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="Quét hoặc nhập mã"
          right={<Pressable onPress={() => setScan(true)} style={styles.scan}><Ionicons name="scan" size={20} color={colors.brand} /></Pressable>} />
        <Text style={styles.label}>Loại sự cố</Text>
        <View style={styles.types}>
          {INCIDENT_TYPES.map((t) => {
            const on = t.key === type; const c = caseColor(t.key);
            return (
              <Pressable key={t.key} onPress={() => setType(t.key)} style={[styles.type, on && { backgroundColor: c.fg, borderColor: c.fg }]}>
                <Ionicons name={t.icon} size={20} color={on ? '#fff' : c.fg} />
                <Text style={[styles.typeText, on && { color: '#fff' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Hint>{type === 'Lost' ? 'Thất lạc: đơn sẽ được gỡ khỏi tồn của kho này.' : type === 'Found' ? 'Tìm thấy: đơn được ghi nhận lại vào kho này.' : 'Hư hỏng: ghi vào hành trình đơn để CSKH xử lý.'}</Hint>
        <WarehouseField label="Kho ghi nhận" value={wh?.id} onChange={setWh} remember="incident" />
        <Field label="Mô tả" icon="document-text-outline" value={note} onChangeText={setNote} multiline placeholder="Mô tả tình trạng, vị trí phát hiện..."
          inputStyle={{ minHeight: 80, textAlignVertical: 'top' }} />
      </Card>
      <Button title="Ghi nhận sự cố" icon="warning" variant="dark" loading={busy} onPress={submit} style={{ marginTop: 18 }} />
      <ScanModal visible={scan} onClose={() => setScan(false)} onCode={setCode} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scan: { paddingHorizontal: 14, height: 48, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 },
  types: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  type: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 11, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  typeText: { fontSize: 13, fontWeight: '700', color: colors.text2 },
});
