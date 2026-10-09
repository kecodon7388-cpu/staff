/** Đơn shipper đang giữ tiền → chọn nhiều → lập phiếu nộp (POST fin/remittances {shipperId, ids, note}) */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { staff } from '../../api';
import { confirmAsk, hapticErr, hapticOk, useLoad } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { ActionChip, Badge, BottomBar, Button, Check, Field, ListState, call } from '../../components/ui';

export default function FinHolderDetailScreen({ route, navigation }) {
  const { shipperId } = route.params;
  const fn = useCallback(async () => {
    const r = await staff.finHolder(shipperId);
    navigation.setOptions({ title: r.shipper?.name || 'Shipper giữ COD' });
    return r;
  }, [shipperId, navigation]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const [sel, setSel] = useState(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const free = useMemo(() => (data?.items || []).filter((o) => !o.inRemittance), [data]);
  useEffect(() => { setSel(new Set(free.map((o) => o.id))); }, [free]);
  const selected = (data?.items || []).filter((o) => sel.has(o.id));
  const amount = selected.reduce((s, o) => s + (o.amount || 0), 0);
  const toggle = (o) => { if (o.inRemittance) return; setSel((s) => { const n = new Set(s); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; }); };
  const allOn = free.length > 0 && free.every((o) => sel.has(o.id));

  const create = async () => {
    if (!selected.length) return Alert.alert('Chưa chọn đơn', 'Chọn đơn cần nộp tiền');
    if (!(await confirmAsk('Lập phiếu nộp tiền', `Lập phiếu nộp ${money(amount)} cho ${selected.length} đơn của ${data.shipper?.name}?\nXác nhận phiếu khi đã nhận đủ tiền.`, 'Lập phiếu'))) return;
    setBusy(true);
    try {
      const r = await staff.finCreateRemittance({ shipperId, ids: selected.map((o) => o.id), note: note.trim() || null });
      hapticOk();
      navigation.replace('FinRemittanceDetail', { id: r.data.id });
      Alert.alert('Đã lập phiếu', r.message);
    } catch (e) { hapticErr(); Alert.alert('Không lập được phiếu', e.message); }
    finally { setBusy(false); }
  };

  if (!data) return <ListState loading={loading} error={error} onRetry={reload} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data.items}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 230 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={(
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hName}>{data.shipper?.name} · {data.shipper?.code}</Text>
              <Text style={styles.hSub}>{data.items.length} đơn · {money(data.items.reduce((s, o) => s + o.amount, 0))}</Text>
            </View>
            <ActionChip icon="call" label="Gọi" color={colors.success} onPress={() => call(data.shipper?.phone)} />
            <Pressable onPress={() => setSel(allOn ? new Set() : new Set(free.map((o) => o.id)))} style={styles.all} hitSlop={6}>
              <Check on={allOn} size={20} /><Text style={styles.allText}>Tất cả</Text>
            </Pressable>
          </View>
        )}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => toggle(o)} onLongPress={() => navigation.navigate('StaffOrderDetail', { id: o.id })}
            style={[styles.item, sel.has(o.id) && { borderColor: colors.brand }, o.inRemittance && { opacity: 0.6 }]}>
            {o.inRemittance ? <View style={{ width: 22 }} /> : <Check on={sel.has(o.id)} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.code}>{o.trackingCode}</Text>
              <Text style={styles.sub} numberOfLines={1}>{[o.receiver, o.shop, dt(o.deliveredAt)].filter(Boolean).join(' · ')}</Text>
              {o.inRemittance ? <Badge text="Đã nằm trong phiếu nộp" fg={colors.info} bg={colors.infoBg} style={{ marginTop: 5 }} /> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amt}>{money(o.amount)}</Text>
              {o.expected !== o.amount ? <Text style={styles.diff}>phải thu {money(o.expected)}</Text> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<ListState icon="wallet-outline" title="Shipper không còn giữ tiền" />}
      />
      {free.length ? (
        <BottomBar>
          <Field icon="document-text-outline" value={note} onChangeText={setNote} placeholder="Ghi chú phiếu nộp (tùy chọn)" style={{ marginBottom: 0 }} />
          <Button title={`Lập phiếu nộp · ${money(amount)} (${selected.length} đơn)`} icon="receipt" variant="success" loading={busy} disabled={!selected.length} onPress={create} />
        </BottomBar>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 2 },
  hName: { fontSize: 16, fontWeight: '800', color: colors.text },
  hSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  allText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  amt: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  diff: { fontSize: 11, color: colors.warning, marginTop: 2 },
});
