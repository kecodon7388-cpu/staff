/**
 * Trạm quét kho: chọn nghiệp vụ (IN nhập kho / SORT phân loại / OUT xuất giao shipper – theo WarehouseOpsService.ScanAsync),
 * kho, vị trí (khi nhập / phân loại) rồi quét liên tục. Mỗi mã gửi ngay POST /api/staff/wh/scan.
 */
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { colors, radius } from '../../theme';
import { dt } from '../../format';
import { Card, Field } from '../../components/ui';
import { LocationField, WarehouseField } from '../../components/PickField';
import { ManualCode, ScannerView } from '../../components/Scanner';

export const SCAN_OPS = [
  { key: 'IN', label: 'Nhập kho', icon: 'enter-outline', color: colors.success, bg: colors.successBg, hint: 'Nhận hàng vào kho (shipper lấy về / trung chuyển đến)', location: true },
  { key: 'SORT', label: 'Phân loại', icon: 'git-branch-outline', color: colors.violet, bg: colors.violetBg, hint: 'Xếp đơn vào kệ / ô theo tuyến', location: true },
  { key: 'OUT', label: 'Xuất giao', icon: 'exit-outline', color: colors.brand, bg: colors.brand100, hint: 'Xuất kho bàn giao shipper đi giao (đơn phải được phân công)' },
];

export default function WhScanScreen({ navigation }) {
  const [op, setOp] = useState('IN');
  const [wh, setWh] = useState(null);
  const [loc, setLoc] = useState(null);
  const [note, setNote] = useState('');
  const [log, setLog] = useState([]);
  const meta = SCAN_OPS.find((o) => o.key === op);

  const send = async (code) => {
    if (!wh) return { ok: false, message: 'Chọn kho làm việc trước' };
    try {
      const r = await staff.whScan({ warehouseId: wh.id, op, locationId: meta.location ? loc?.id || null : null, codes: [code], note: note.trim() || null });
      const res = (r.results || [])[0] || { code, ok: r.okCount > 0, message: r.message };
      setLog((l) => [{ ...res, code: res.code || code, op, t: Date.now() }, ...l].slice(0, 300));
      return { ok: res.ok, message: res.message };
    } catch (e) {
      setLog((l) => [{ code, ok: false, message: e.message, op, t: Date.now() }, ...l].slice(0, 300));
      return { ok: false, message: e.message };
    }
  };

  const okCount = log.filter((x) => x.ok).length;

  const header = (
    <View style={{ padding: 16, paddingBottom: 8 }}>
      <View style={styles.ops}>
        {SCAN_OPS.map((o) => {
          const on = o.key === op;
          return (
            <Pressable key={o.key} onPress={() => setOp(o.key)} style={[styles.op, on && { backgroundColor: o.color, borderColor: o.color }]}>
              <Ionicons name={o.icon} size={18} color={on ? '#fff' : o.color} />
              <Text style={[styles.opText, on && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{meta.hint}</Text>
      <Card style={{ marginTop: 10, paddingBottom: 2 }}>
        <WarehouseField value={wh?.id} onChange={(w) => { setWh(w); setLoc(null); }} remember="scan" label="Kho làm việc" />
        {meta.location ? <LocationField warehouseId={wh?.id} value={loc?.id} onChange={setLoc} /> : null}
        <Field label="Ghi chú (tùy chọn)" icon="document-text-outline" value={note} onChangeText={setNote} placeholder="VD: chuyến xe 51C-123.45" />
      </Card>
      <ScannerView onCode={send} height={250} paused={!wh} hint={wh ? `${meta.label} · ${wh.code}${loc ? ' · ' + loc.code : ''}` : 'Chọn kho để bắt đầu quét'} style={{ marginTop: 12 }} />
      <View style={{ marginTop: 10 }}><ManualCode onSubmit={send} placeholder="Nhập mã vận đơn thủ công" /></View>
      <View style={styles.sumRow}>
        <Text style={styles.sum}>Đã quét {log.length} · thành công {okCount} · lỗi {log.length - okCount}</Text>
        {log.length ? <Pressable onPress={() => setLog([])} hitSlop={8}><Text style={styles.clear}>Xóa danh sách</Text></Pressable> : null}
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={log}
      keyExtractor={(x) => x.t + x.code}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => (
        <Pressable onPress={() => item.orderId && navigation.navigate('StaffOrderDetail', { id: item.orderId })}
          style={[styles.row, { borderLeftColor: item.ok ? colors.success : colors.danger }]}>
          <Ionicons name={item.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={item.ok ? colors.success : colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{item.code}</Text>
            <Text style={[styles.msg, !item.ok && { color: colors.danger }]}>{item.message}</Text>
          </View>
          <Text style={styles.time}>{SCAN_OPS.find((o) => o.key === item.op)?.label} · {dt(new Date(item.t).toISOString())}</Text>
        </Pressable>
      )}
      ListEmptyComponent={<Text style={styles.empty}>Chưa quét mã nào. Kết quả từng mã sẽ hiện ở đây.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  ops: { flexDirection: 'row', gap: 8 },
  op: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  opText: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  hint: { fontSize: 12.5, color: colors.muted, marginTop: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  sum: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  clear: { fontSize: 13, color: colors.brand, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  code: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  msg: { fontSize: 12.5, color: colors.text2, marginTop: 2 },
  time: { fontSize: 11, color: colors.faint },
  empty: { textAlign: 'center', color: colors.muted, padding: 24 },
});
