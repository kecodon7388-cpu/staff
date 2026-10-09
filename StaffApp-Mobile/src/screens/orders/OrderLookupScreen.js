/**
 * Tra cứu vận đơn: GET /api/staff/orders?q=&status= (máy chủ trả tối đa 50 đơn, không phân trang;
 * không nhập gì → đơn 7 ngày gần nhất). Quét mã → mở thẳng chi tiết.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { hapticErr, useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { Chips, HeaderIconButton, ListFooter, ListState, NavyHeader, SearchBar, StatusBadge } from '../../components/ui';
import { ScanModal } from '../../components/Scanner';

export const ORDER_STATUS = [
  { key: null, label: 'Tất cả' }, { key: 'AwaitingPickup', label: 'Chờ lấy' }, { key: 'PickedUp', label: 'Đã lấy' }, { key: 'InWarehouse', label: 'Trong kho' },
  { key: 'InTransit', label: 'Trung chuyển' }, { key: 'ArrivedDestination', label: 'Đến kho giao' }, { key: 'Delivering', label: 'Đang giao' },
  { key: 'Delivered', label: 'Đã giao' }, { key: 'DeliveryFailed', label: 'Giao lỗi' }, { key: 'Rescheduled', label: 'Hẹn lại' },
  { key: 'Returning', label: 'Đang hoàn' }, { key: 'Returned', label: 'Đã hoàn' }, { key: 'Cancelled', label: 'Đã hủy' },
];

export default function OrderLookupScreen({ navigation, route, embedded }) {
  const { has } = useAuth();
  const [q, setQ] = useState(route.params?.q || '');
  const [query, setQuery] = useState(route.params?.q || '');
  const [status, setStatus] = useState(route.params?.status ?? null);
  const [scan, setScan] = useState(false);

  useEffect(() => { if (route.params?.q != null) { setQ(route.params.q); setQuery(route.params.q); } }, [route.params?.q]);
  useEffect(() => { if (route.params?.status !== undefined) setStatus(route.params.status); }, [route.params?.status]);

  const fn = useCallback(async () => (await staff.searchOrders({ q: query, status })).items || [], [query, status]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data, 25);

  const byCode = async (code) => {
    try { const r = await staff.orderByCode(code); navigation.navigate('StaffOrderDetail', { id: r.data.id }); }
    catch (e) { hapticErr(); Alert.alert('Không tìm thấy', e.message); setQ(code); setQuery(code); }
  };

  const body = (
    <>
      <View style={styles.top}>
        <SearchBar value={q} onChangeText={setQ} onSubmit={(v) => setQuery(typeof v === 'string' ? v : q)} placeholder="Mã vận đơn, mã shop, SĐT, tên người nhận" onScan={() => setScan(true)} />
        <Chips style={{ marginTop: 10 }} items={ORDER_STATUS} value={status} onChange={setStatus} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={!query && !status && data?.length ? <Text style={styles.hint}>Đơn tạo trong 7 ngày gần đây</Text> : null}
        renderItem={({ item: o }) => (
          <Pressable onPress={() => navigation.navigate('StaffOrderDetail', { id: o.id })} style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{o.trackingCode}</Text>
                {o.referenceCode ? <Text style={styles.ref}>Mã shop: {o.referenceCode}</Text> : null}
              </View>
              <StatusBadge status={o.status} text={o.statusText} />
            </View>
            <View style={styles.line}><Ionicons name="person-outline" size={14} color={colors.muted} /><Text style={styles.text} numberOfLines={1}>{o.receiverName} · {o.receiverPhone}</Text></View>
            <View style={styles.line}><Ionicons name="location-outline" size={14} color={colors.muted} /><Text style={styles.text} numberOfLines={1}>{o.area || '—'}</Text></View>
            <View style={styles.bottom}>
              <Text style={styles.meta} numberOfLines={1}>{[o.shop, dt(o.createdAt)].filter(Boolean).join(' · ')}</Text>
              <Text style={styles.cod}>{o.codAmount > 0 ? 'COD ' + money(o.codAmount) : 'Không COD'}</Text>
            </View>
            {o.failedAttempts > 0 ? <Text style={styles.fail}>Giao lỗi {o.failedAttempts} lần</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="search-outline" title="Không tìm thấy vận đơn" text="Thử mã khác hoặc bỏ lọc trạng thái" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note={total >= 50 ? 'tối đa 50 kết quả – nhập cụ thể hơn' : null} />}
      />
      <ScanModal visible={scan} onClose={() => setScan(false)} onCode={byCode} title="Quét mã tra cứu" />
    </>
  );

  if (!embedded) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{body}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavyHeader title="Tra cứu vận đơn" sub="Theo mã, SĐT, tên người nhận" back={route.name.endsWith('Hub')} onBack={() => navigation.goBack()}
        right={has('dashboard') ? <HeaderIconButton icon="stats-chart" onPress={() => navigation.navigate('Dashboard')} /> : null} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  hint: { fontSize: 12.5, color: colors.muted, marginBottom: 8, fontWeight: '600' },
  item: { backgroundColor: '#fff', padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 15, fontWeight: '800', color: colors.text },
  ref: { fontSize: 12, color: colors.faint, marginTop: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  text: { flex: 1, fontSize: 13.5, color: colors.text2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  meta: { flex: 1, fontSize: 12, color: colors.faint },
  cod: { fontSize: 13, fontWeight: '700', color: colors.text },
  fail: { fontSize: 12, fontWeight: '700', color: colors.warning, marginTop: 6 },
});
