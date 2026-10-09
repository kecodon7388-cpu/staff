import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shipper } from '../../api';
import { colors, radius } from '../../theme';
import { addDays, isoDay, weekday } from '../../format';
import { Button, Field, Loading, SectionTitle } from '../../components/ui';

const PICKUP_REASONS = ['Shop chưa chuẩn bị hàng', 'Không liên lạc được shop', 'Shop hẹn lấy hôm khác', 'Sai địa chỉ lấy hàng', 'Hàng không đúng quy cách / cồng kềnh'];

export default function FailScreen({ route, navigation }) {
  const { id, mode, code } = route.params;
  const insets = useSafeAreaInsets();
  const isPickup = mode === 'pickup';
  const [reasons, setReasons] = useState(isPickup ? PICKUP_REASONS.map((n, i) => ({ id: i, name: n })) : null);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [day, setDay] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isPickup ? 'Lấy hàng không thành công' : 'Giao không thành công' });
    if (!isPickup) shipper.reasons().then((r) => { setReasons(r.items || []); setMaxAttempts(r.maxAttempts || 3); }).catch((e) => Alert.alert('Lỗi', e.message));
  }, [isPickup, navigation]);

  const sel = reasons?.find((r) => r.id === selected);

  const submit = async () => {
    if (selected == null && !note.trim()) { Alert.alert('Chọn lý do', 'Vui lòng chọn hoặc nhập lý do'); return; }
    setBusy(true);
    try {
      const r = isPickup
        ? await shipper.pickupFail(id, [sel?.name, note.trim()].filter(Boolean).join(' – '))
        : await shipper.fail(id, { reasonId: sel?.id ?? null, note: note.trim() || null, rescheduleDate: isoDay(addDays(day)) });
      Alert.alert('Đã ghi nhận', r.message || '');
      navigation.navigate('Main', { screen: 'Tasks', params: { type: isPickup ? 'pickup' : 'delivery' } });
    } catch (e) { Alert.alert('Không gửi được', e.message); }
    finally { setBusy(false); }
  };

  if (!reasons) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.code}>Đơn {code}</Text>
        <SectionTitle title="Lý do" style={{ marginTop: 8 }} />
        <View style={styles.list}>
          {reasons.map((r, i) => {
            const on = selected === r.id;
            return (
              <Pressable key={r.id} onPress={() => setSelected(on ? null : r.id)} style={[styles.reason, i < reasons.length - 1 && styles.reasonBorder]}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.brand : colors.faint} />
                <Text style={[styles.reasonText, on && { color: colors.text, fontWeight: '600' }]}>{r.name}</Text>
                {r.forceReturn ? <Text style={styles.force}>Chuyển hoàn</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <Field label="Ghi chú thêm" icon="document-text-outline" value={note} onChangeText={setNote} placeholder="VD: Khách hẹn sau 17h, gọi trước khi đến"
          multiline style={{ marginTop: 16 }} inputStyle={{ minHeight: 70, textAlignVertical: 'top' }} />

        {!isPickup ? (
          <>
            <SectionTitle title="Hẹn giao lại" />
            <View style={styles.days}>
              {[1, 2, 3].map((n) => {
                const d = addDays(n);
                const on = day === n;
                return (
                  <Pressable key={n} onPress={() => setDay(n)} style={[styles.day, on && styles.dayOn]}>
                    <Text style={[styles.dayTop, on && { color: '#fff' }]}>{n === 1 ? 'Ngày mai' : n === 2 ? 'Ngày kia' : weekday(d)}</Text>
                    <Text style={[styles.dayNum, on && { color: '#fff' }]}>{d.getDate()}/{d.getMonth() + 1}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.note}>
              <Ionicons name="information-circle" size={18} color={colors.info} />
              <Text style={styles.noteText}>
                {sel?.forceReturn ? 'Lý do này sẽ chuyển hoàn đơn về shop ngay.' : `Quá ${maxAttempts} lần giao không thành công, đơn sẽ tự động chuyển hoàn. Có thể phát sinh phí giao lại.`}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="Gửi báo cáo" icon="send" variant="dark" loading={busy} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  list: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  reasonBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  reasonText: { flex: 1, fontSize: 15, color: colors.text2 },
  force: { fontSize: 11, fontWeight: '700', color: colors.warning, backgroundColor: colors.warningBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  days: { flexDirection: 'row', gap: 10 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  dayOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayTop: { fontSize: 12.5, color: colors.muted, fontWeight: '600' },
  dayNum: { fontSize: 18, color: colors.text, fontWeight: '800', marginTop: 2 },
  note: { flexDirection: 'row', gap: 8, marginTop: 14, backgroundColor: colors.infoBg, padding: 12, borderRadius: 12 },
  noteText: { flex: 1, color: '#155E75', fontSize: 13, lineHeight: 18 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
