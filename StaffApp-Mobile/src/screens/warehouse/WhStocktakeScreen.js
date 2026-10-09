/**
 * Kiểm kê: chọn kho → quét nhiều mã vào danh sách trên máy → gửi POST /api/staff/wh/stocktake
 * (record = false: chỉ so khớp; record = true: ghi nhận kết quả kiểm kê) → hiện 3 nhóm matched / missing / extra.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { confirmAsk, hapticErr, hapticOk } from '../../hooks';
import { colors, radius } from '../../theme';
import { BottomBar, Button, Card, ErrorBox } from '../../components/ui';
import { WarehouseField } from '../../components/PickField';
import { ManualCode, ScannerView } from '../../components/Scanner';

export default function WhStocktakeScreen() {
  const [wh, setWh] = useState(null);
  const [codes, setCodes] = useState([]);
  const [result, setResult] = useState(null);
  const [group, setGroup] = useState('missing');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = (code) => {
    if (codes.includes(code)) return { ok: false, message: 'Đã có trong danh sách' };
    setCodes((c) => [code, ...c]);
    setResult(null);
    return { ok: true, message: 'Đã thêm' };
  };

  const submit = async (record) => {
    if (!wh) { setError('Chọn kho kiểm kê'); return; }
    if (record && !(await confirmAsk('Ghi nhận kiểm kê', `Ghi nhận kết quả kiểm kê ${wh.code} với ${codes.length} mã đã quét? Đơn không quét thấy sẽ được ghi "KHÔNG thấy hàng".`, 'Ghi nhận'))) return;
    setBusy(true); setError('');
    try {
      const r = await staff.whStocktake({ warehouseId: wh.id, codes, record });
      setResult({ ...r, record });
      setGroup(r.missing?.length ? 'missing' : r.extra?.length ? 'extra' : 'matched');
      hapticOk();
    } catch (e) { setError(e.message); hapticErr(); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (codes.length && !(await confirmAsk('Làm lại', 'Xóa toàn bộ mã đã quét?', 'Xóa', true))) return;
    setCodes([]); setResult(null);
  };

  const groups = result ? [
    { key: 'matched', label: 'Khớp', count: result.matched?.length || 0, color: colors.success, icon: 'checkmark-circle' },
    { key: 'missing', label: 'Thiếu', count: result.missing?.length || 0, color: colors.danger, icon: 'alert-circle' },
    { key: 'extra', label: 'Thừa', count: result.extra?.length || 0, color: colors.warning, icon: 'help-circle' },
  ] : [];
  const g = groups.find((x) => x.key === group);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 170 }} keyboardShouldPersistTaps="handled">
        <Card style={{ paddingBottom: 2 }}>
          <WarehouseField label="Kho kiểm kê" value={wh?.id} onChange={(w) => { setWh(w); setResult(null); }} remember="stocktake" />
        </Card>
        <ScannerView onCode={add} height={220} paused={!wh} hint={wh ? `Kiểm kê ${wh.code} · đã quét ${codes.length}` : 'Chọn kho để bắt đầu'} style={{ marginTop: 12 }} />
        <View style={{ marginTop: 10 }}><ManualCode onSubmit={add} /></View>
        {error ? <ErrorBox text={error} style={{ marginTop: 12 }} /> : null}

        {result ? (
          <Card style={{ marginTop: 14 }}>
            <Text style={styles.resTitle}>{result.record ? 'Đã ghi nhận kiểm kê' : 'Kết quả so khớp'}</Text>
            <Text style={styles.resSub}>{result.message}</Text>
            <View style={styles.groupRow}>
              {groups.map((x) => (
                <Pressable key={x.key} onPress={() => setGroup(x.key)} style={[styles.groupBox, group === x.key && { borderColor: x.color, backgroundColor: '#fff' }]}>
                  <Ionicons name={x.icon} size={18} color={x.color} />
                  <Text style={[styles.groupNum, { color: x.color }]}>{x.count}</Text>
                  <Text style={styles.groupLbl}>{x.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.groupHint}>
              {group === 'matched' ? 'Có trên hệ thống và đã quét thấy.' : group === 'missing' ? 'Hệ thống ghi đang ở kho nhưng KHÔNG quét thấy – kiểm tra thất lạc.' : 'Quét thấy nhưng hệ thống không ghi ở kho này – cần nhập kho / kiểm tra.'}
            </Text>
            {(result[group] || []).map((c) => (
              <View key={c} style={styles.codeRow}>
                <Ionicons name={g.icon} size={15} color={g.color} />
                <Text style={styles.codeText}>{c}</Text>
              </View>
            ))}
            {(result[group] || []).length === 0 ? <Text style={styles.none}>Không có mã nào</Text> : null}
          </Card>
        ) : null}

        <View style={styles.listHead}>
          <Text style={styles.listTitle}>Mã đã quét ({codes.length})</Text>
          {codes.length ? <Pressable onPress={reset}><Text style={styles.link}>Làm lại</Text></Pressable> : null}
        </View>
        {codes.length === 0 ? <Text style={styles.none}>Chưa quét mã nào</Text> : (
          <View style={styles.chips}>
            {codes.map((c) => (
              <Pressable key={c} onPress={() => { setCodes((x) => x.filter((y) => y !== c)); setResult(null); }} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
                <Ionicons name="close" size={14} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomBar>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="So khớp" icon="git-compare-outline" variant="outline" style={{ flex: 1 }} loading={busy} disabled={!wh} onPress={() => submit(false)} />
          <Button title="Ghi nhận" icon="checkmark-done" style={{ flex: 1 }} loading={busy} disabled={!wh} onPress={() => submit(true)} />
        </View>
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  resTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  resSub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  groupRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  groupBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: '#F8FAFC' },
  groupNum: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  groupLbl: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  groupHint: { fontSize: 12.5, color: colors.muted, marginTop: 10, marginBottom: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  codeText: { fontSize: 14, fontWeight: '700', color: colors.text },
  none: { color: colors.faint, textAlign: 'center', paddingVertical: 10 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  listTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  link: { color: colors.danger, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 6 },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.text2 },
});
