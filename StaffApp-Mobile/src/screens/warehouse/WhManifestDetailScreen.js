import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAction, useLoad } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { BottomBar, Button, CaseBadge, Card, ListState, Row } from '../../components/ui';
import { ScanModal } from '../../components/Scanner';

export default function WhManifestDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const fn = useCallback(async () => {
    const r = await staff.whManifest(id);
    navigation.setOptions({ title: r.data.manifest.code });
    return r.data;
  }, [id, navigation]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { busy, run } = useAction();
  const [scanMode, setScanMode] = useState(null); // 'add' | 'receive'

  if (!data) return <ListState loading={loading} error={error} onRetry={reload} />;
  const m = data.manifest;
  const a = data.actions || [];
  const canAdd = a.includes('add');

  const addCode = async (code) => {
    try {
      const r = await staff.whManifestAdd(id, { codes: [code] });
      return r.added > 0 ? { ok: true, message: 'Đã thêm vào bảng kê' } : { ok: false, message: (r.errors || [])[0] || 'Không thêm được' };
    } catch (e) { return { ok: false, message: e.message }; }
  };
  const receiveCode = async (code) => {
    try {
      const r = await staff.whManifestReceive(id, [code]);
      return r.received > 0 ? { ok: true, message: `Đã nhận · còn thiếu ${r.missing}` } : { ok: false, message: 'Không thuộc bảng kê hoặc đã nhận' };
    } catch (e) { return { ok: false, message: e.message }; }
  };

  const autoRoute = () => run('auto', () => staff.whManifestAdd(id, { autoRoute: true }), {
    confirm: { title: 'Gom tự động', text: m.type === 'Transfer' ? `Thêm tất cả đơn đang ở ${m.from} có điểm đến thuộc ${m.to}?` : `Thêm tất cả đơn ở ${m.from} đã phân công cho ${m.shipper}?`, ok: 'Gom đơn' },
    onDone: (r) => { if (r?.errors?.length) Alert.alert('Một số đơn không thêm được', r.errors.slice(0, 8).join('\n')); return reload(); },
  });
  const remove = (it) => run('rm' + it.itemId, () => staff.whManifestRemove(id, it.itemId), {
    confirm: { title: 'Bỏ đơn khỏi bảng kê', text: `Bỏ ${it.trackingCode} khỏi ${m.code}?`, ok: 'Bỏ đơn', destructive: true }, success: false, onDone: reload,
  });
  const dispatch = () => run('dispatch', () => staff.whManifestDispatch(id), {
    confirm: {
      title: 'Xuất bảng kê', ok: 'Xuất',
      text: m.type === 'Transfer' ? `Xuất ${m.count} đơn từ ${m.from} đi ${m.to}? Đơn sẽ chuyển sang "Đang trung chuyển".` : `Bàn giao ${m.count} đơn cho ${m.shipper}? Đơn sẽ chuyển sang "Đang giao".`,
    },
    onDone: reload,
  });
  const receiveAll = () => run('receive', () => staff.whManifestReceive(id, []), {
    confirm: { title: 'Nhận tất cả', text: `Xác nhận kho ${m.to} đã nhận đủ ${m.count - m.received} đơn còn lại?`, ok: 'Nhận tất cả' }, onDone: reload,
  });
  const receive = () => Alert.alert('Nhận bảng kê', 'Chọn cách nhận hàng', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Quét từng đơn', onPress: () => setScanMode('receive') },
    { text: 'Nhận tất cả', onPress: receiveAll },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data.items}
        keyExtractor={(it) => String(it.itemId)}
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={(
          <View>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{m.code}</Text>
                  <Text style={styles.sub}>{m.typeText}</Text>
                </View>
                <CaseBadge status={m.status} text={m.statusText} />
              </View>
              <View style={{ marginTop: 8 }}>
                <Row icon="exit-outline" label="Kho xuất" value={m.from} />
                <Row icon={m.type === 'Transfer' ? 'enter-outline' : 'bicycle-outline'} label={m.type === 'Transfer' ? 'Kho đích' : 'Shipper'} value={m.to || m.shipper || '—'} />
                <Row icon="cube-outline" label="Số đơn" value={m.status === 'Open' ? `${m.count}` : `${m.received}/${m.count} đã nhận`} />
                <Row icon="time-outline" label="Tạo lúc" value={`${dt(m.createdAt)}${m.createdBy ? ' · ' + m.createdBy : ''}`} last={!m.dispatchedAt && !m.note} />
                {m.dispatchedAt ? <Row icon="send-outline" label="Xuất lúc" value={dt(m.dispatchedAt)} last={!m.note} /> : null}
                {m.note ? <Row icon="document-text-outline" label="Ghi chú" value={m.note} last /> : null}
              </View>
            </Card>
            {canAdd ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Button title="Quét thêm đơn" icon="scan" size="md" style={{ flex: 1 }} onPress={() => setScanMode('add')} />
                <Button title="Gom tự động" icon="flash-outline" size="md" variant="soft" style={{ flex: 1 }} loading={busy === 'auto'} onPress={autoRoute} />
              </View>
            ) : null}
            <Text style={styles.listHead}>Danh sách đơn ({data.items.length})</Text>
          </View>
        )}
        renderItem={({ item: it }) => (
          <Pressable onPress={() => navigation.navigate('StaffOrderDetail', { id: it.orderId })} style={styles.item}>
            <Ionicons name={it.receivedAt ? 'checkmark-circle' : 'cube-outline'} size={20} color={it.receivedAt ? colors.success : colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemCode}>{it.trackingCode}</Text>
              <Text style={styles.itemSub} numberOfLines={1}>{[it.receiver, it.province, it.weight != null ? it.weight + ' kg' : null].filter(Boolean).join(' · ')}</Text>
              {it.receivedAt ? <Text style={[styles.itemSub, { color: colors.success }]}>Đã nhận {dt(it.receivedAt)}</Text> : null}
            </View>
            {it.codAmount > 0 ? <Text style={styles.cod}>{money(it.codAmount)}</Text> : null}
            {canAdd ? (
              <Pressable onPress={() => remove(it)} hitSlop={10} style={styles.rm}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{canAdd ? 'Chưa có đơn. Quét mã hoặc gom tự động để thêm.' : 'Bảng kê không có đơn.'}</Text>}
      />
      {a.includes('dispatch') || a.includes('receive') ? (
        <BottomBar>
          {a.includes('dispatch') ? <Button title={m.type === 'Transfer' ? `Xuất bảng kê (${m.count} đơn)` : `Bàn giao shipper (${m.count} đơn)`} icon="send" variant="dark" loading={busy === 'dispatch'} onPress={dispatch} /> : null}
          {a.includes('receive') ? <Button title={`Nhận hàng (${m.received}/${m.count})`} icon="download-outline" variant="success" loading={busy === 'receive'} onPress={receive} /> : null}
        </BottomBar>
      ) : null}
      <ScanModal visible={!!scanMode} single={false} title={scanMode === 'receive' ? 'Quét nhận hàng' : 'Quét thêm vào bảng kê'}
        onClose={() => { setScanMode(null); reload(); }} onCode={scanMode === 'receive' ? receiveCode : addCode} />
    </View>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 19, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  listHead: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  itemCode: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  cod: { fontSize: 13, fontWeight: '700', color: colors.text },
  rm: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.muted, padding: 24 },
});
