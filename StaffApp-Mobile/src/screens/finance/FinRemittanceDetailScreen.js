import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useAction, useLoad } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { BottomBar, Button, CaseBadge, Card, ListState, Row } from '../../components/ui';

export default function FinRemittanceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { can } = useAuth();
  const fn = useCallback(async () => {
    const r = await staff.finRemittance(id);
    navigation.setOptions({ title: r.data.remittance.code });
    return r.data;
  }, [id, navigation]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { busy, run } = useAction();
  if (!data) return <ListState loading={loading} error={error} onRetry={reload} />;
  const r = data.remittance;
  const actionable = r.status === 'Draft' && can('cod.manage');

  const confirm = () => run('confirm', () => staff.finConfirmRemittance(id), {
    confirm: { title: 'Xác nhận đã nhận tiền', text: `Đã nhận đủ ${money(r.amount)} từ ${r.shipper} cho ${r.count} đơn? COD sẽ chuyển sang "Đã nộp về công ty".`, ok: 'Đã nhận đủ' },
    onDone: reload,
  });
  const cancel = () => run('cancel', () => staff.finCancelRemittance(id), {
    confirm: { title: 'Hủy phiếu nộp', text: `Hủy phiếu ${r.code}? Các đơn sẽ được trả về trạng thái shipper đang giữ tiền.`, ok: 'Hủy phiếu', destructive: true },
    onDone: reload,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data.items}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: actionable ? 160 : 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={(
          <View>
            <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.code}>{r.code}</Text>
                <CaseBadge status={r.status} text={r.statusText} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={styles.amt}>{money(r.amount)}</Text>
              <Text style={styles.heroSub}>{r.count} đơn · {r.shipper} ({r.shipperCode})</Text>
            </Card>
            <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <Row icon="person-outline" label="Người lập" value={`${r.createdBy || '—'} · ${dt(r.createdAt)}`} />
              <Row icon="checkmark-done-outline" label="Xác nhận" value={r.confirmedAt ? `${r.confirmedBy || ''} · ${dt(r.confirmedAt)}` : 'Chưa'} last={!r.note} />
              {r.note ? <Row icon="document-text-outline" label="Ghi chú" value={r.note} last /> : null}
            </Card>
            <Text style={styles.listHead}>Đơn trong phiếu ({data.items.length})</Text>
          </View>
        )}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => navigation.navigate('StaffOrderDetail', { id: o.id })} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.iCode}>{o.trackingCode}</Text>
              <Text style={styles.iSub} numberOfLines={1}>{[o.receiver, o.shop, dt(o.deliveredAt)].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={styles.iAmt}>{money(o.amount)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<ListState icon="cube-outline" title="Phiếu không có đơn" />}
      />
      {actionable ? (
        <BottomBar>
          <Button title={`Xác nhận đã nhận ${money(r.amount)}`} icon="checkmark-circle" variant="success" loading={busy === 'confirm'} onPress={confirm} />
          <Button title="Hủy phiếu nộp" icon="close-circle-outline" variant="danger" size="md" loading={busy === 'cancel'} onPress={cancel} />
        </BottomBar>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  code: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700' },
  amt: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 8, letterSpacing: -0.6 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  listHead: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  iCode: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  iSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  iAmt: { fontSize: 14.5, fontWeight: '800', color: colors.text },
});
