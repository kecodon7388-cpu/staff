/**
 * Yêu cầu hoàn – cập nhật theo DTO ReturnUpdateRequest: op (start | receive | assign | returned | cancel), shipperId, warehouseId, note.
 * Các nút hiện theo data.actions của máy chủ.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { staff } from '../../api';
import { useAction, useLoad } from '../../hooks';
import { colors } from '../../theme';
import { dt, money } from '../../format';
import { ActionChip, Button, CaseBadge, Card, Field, ListState, Row, SectionTitle, Sheet, call } from '../../components/ui';
import { ShipperField, WarehouseField } from '../../components/PickField';

const OPS = {
  start: { label: 'Bắt đầu hoàn', icon: 'play', variant: 'primary', wh: true, desc: 'Chuyển "Đang hoàn" và chọn kho hoàn nhận hàng.' },
  receive: { label: 'Nhận vào kho hoàn', icon: 'download-outline', variant: 'soft', wh: true, desc: 'Hàng hoàn đã về kho – nhập kho hàng hoàn.' },
  assign: { label: 'Phân shipper trả', icon: 'bicycle', variant: 'soft', shipper: true, desc: 'Giao cho shipper mang hàng hoàn trả shop.' },
  returned: { label: 'Đã trả shop', icon: 'checkmark-done', variant: 'success', desc: 'Ghi nhận đã bàn giao hàng hoàn cho shop.' },
  cancel: { label: 'Hủy yêu cầu hoàn', icon: 'close-circle-outline', variant: 'danger', desc: 'Hủy hoàn, đơn quay lại hàng chờ giao (giao lại từ ngày mai).' },
};

export default function ReturnDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const fn = useCallback(async () => {
    const r = await staff.returnDetail(id);
    navigation.setOptions({ title: r.data.code });
    return r.data;
  }, [id, navigation]);
  const { data: r, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { busy, run } = useAction();
  const [op, setOp] = useState(null);
  const [wh, setWh] = useState(null);
  const [sp, setSp] = useState(null);
  const [note, setNote] = useState('');

  if (!r) return <ListState loading={loading} error={error} onRetry={reload} />;
  const actions = r.actions || [];
  const meta = op ? OPS[op] : null;

  const open = (k) => { setOp(k); setWh(r.warehouse ? { id: r.warehouse.id, name: r.warehouse.name } : null); setSp(null); setNote(''); };

  const submit = async () => {
    const k = op;
    const m = OPS[k];
    if (m.shipper && !sp) return;
    setOp(null);
    await new Promise((res) => setTimeout(res, 350));
    await run(k, () => staff.updateReturn(id, { op: k, shipperId: m.shipper ? sp.id : null, warehouseId: m.wh ? wh?.id || null : null, note: note.trim() || null }), {
      confirm: { title: m.label, text: `${m.label} cho đơn ${r.order.trackingCode}?${m.shipper ? `\nShipper: ${sp.name}` : ''}${m.wh && wh ? `\nKho: ${wh.name}` : ''}`, ok: 'Xác nhận', destructive: k === 'cancel' },
      onDone: reload,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.code}>{r.code}</Text>
            <CaseBadge status={r.status} text={r.statusText} />
            {r.isAuto ? <Text style={styles.auto}>Tự động</Text> : null}
          </View>
          <Text style={styles.reason}>{r.reason || 'Không ghi lý do'}</Text>
          {r.note ? <Text style={styles.note}>Ghi chú: {r.note}</Text> : null}
        </Card>
        <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Row icon="cash-outline" label="Phí hoàn" value={money(r.fee)} />
          <Row icon="business-outline" label="Kho hoàn" value={r.warehouse?.name || '—'} />
          <Row icon="bicycle-outline" label="Shipper trả" value={r.shipper ? `${r.shipper.name}` : '—'} onPress={r.shipper?.phone ? () => call(r.shipper.phone) : undefined} />
          <Row icon="time-outline" label="Tạo lúc" value={dt(r.createdAt)} last={!r.returnedAt && !r.shopConfirmedAt} />
          {r.returnedAt ? <Row icon="checkmark-outline" label="Trả shop" value={dt(r.returnedAt)} last={!r.shopConfirmedAt} /> : null}
          {r.shopConfirmedAt ? <Row icon="checkmark-done-outline" label="Shop xác nhận" value={dt(r.shopConfirmedAt)} last /> : null}
        </Card>

        <SectionTitle title="Vận đơn & người gửi" />
        <Card onPress={() => navigation.navigate('StaffOrderDetail', { id: r.order.id })}>
          <Text style={styles.oCode}>{r.order.trackingCode} · {r.order.statusText}</Text>
          <Text style={styles.oSub}>{r.order.shop} · {r.order.itemName}{r.order.failedAttempts ? ` · giao lỗi ${r.order.failedAttempts} lần` : ''}</Text>
          <Text style={styles.sender}>{r.order.sender?.name} · {r.order.sender?.phone}</Text>
          <Text style={styles.oSub}>{r.order.sender?.address}</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <ActionChip icon="call" label="Gọi người gửi" color={colors.success} onPress={() => call(r.order.sender?.phone)} />
          </View>
        </Card>

        {actions.length ? (
          <>
            <SectionTitle title="Cập nhật" />
            <View style={{ gap: 10 }}>
              {actions.map((k) => OPS[k] ? (
                <Button key={k} title={OPS[k].label} icon={OPS[k].icon} variant={OPS[k].variant} size="md" loading={busy === k} onPress={() => open(k)} />
              ) : null)}
            </View>
          </>
        ) : <Text style={styles.done}>Yêu cầu hoàn đã kết thúc</Text>}
      </ScrollView>

      <Sheet visible={!!op} title={meta?.label || ''} onClose={() => setOp(null)}
        footer={<Button title="Xác nhận" icon="checkmark" onPress={submit} disabled={meta?.shipper && !sp} style={{ marginTop: 8 }} />}>
        {meta ? <Text style={styles.desc}>{meta.desc}</Text> : null}
        {meta?.wh ? <WarehouseField label="Kho hoàn" value={wh?.id} onChange={setWh} /> : null}
        {meta?.shipper ? <ShipperField label="Shipper trả hàng" value={sp?.id} onChange={setSp} /> : null}
        <Field label="Ghi chú" icon="document-text-outline" value={note} onChangeText={setNote} placeholder="Tùy chọn" />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 17, fontWeight: '800', color: colors.text },
  auto: { marginLeft: 'auto', fontSize: 11.5, fontWeight: '700', color: colors.violet },
  reason: { fontSize: 14.5, color: colors.text2, marginTop: 8, lineHeight: 20 },
  note: { fontSize: 13, color: colors.muted, marginTop: 6 },
  oCode: { fontSize: 15, fontWeight: '800', color: colors.text },
  oSub: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  sender: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 10 },
  done: { textAlign: 'center', color: colors.muted, marginTop: 20 },
  desc: { fontSize: 13, color: colors.muted, marginBottom: 12 },
});
