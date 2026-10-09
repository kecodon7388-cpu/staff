import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt } from '../../format';
import { CaseBadge, Chips, ListFooter, ListState } from '../../components/ui';
import { WarehouseField } from '../../components/PickField';

export const MANIFEST_STATUS = [
  { key: null, label: 'Tất cả' },
  { key: 'Open', label: 'Đang gom' },
  { key: 'Dispatched', label: 'Đã xuất' },
  { key: 'Received', label: 'Đã nhận' },
  { key: 'Cancelled', label: 'Đã hủy' },
];

export default function WhManifestsScreen({ navigation, route }) {
  const [status, setStatus] = useState(route.params?.status ?? null);
  const [wh, setWh] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('WhManifestCreate')} hitSlop={8} style={styles.add}>
          <Ionicons name="add" size={20} color="#fff" /><Text style={styles.addText}>Tạo</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const fn = useCallback(() => staff.whManifests({ status, warehouseId: wh?.id }), [status, wh]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data?.items, 30);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Chips items={MANIFEST_STATUS} value={status} onChange={setStatus} />
        <WarehouseField value={wh?.id} onChange={setWh} allowClear label={null} style={{ marginTop: 10, marginBottom: 0 }} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: m }) => (
          <Pressable onPress={() => navigation.navigate('WhManifestDetail', { id: m.id })} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.9 : 1 }]}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: m.type === 'Transfer' ? colors.violetBg : colors.brand100 }]}>
                <Ionicons name={m.type === 'Transfer' ? 'bus-outline' : 'bicycle-outline'} size={18} color={m.type === 'Transfer' ? colors.violet : colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{m.code}</Text>
                <Text style={styles.sub}>{m.typeText}</Text>
              </View>
              <CaseBadge status={m.status} text={m.statusText} />
            </View>
            <View style={styles.route}>
              <Text style={styles.routeText} numberOfLines={1}>{m.from}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.faint} />
              <Text style={styles.routeText} numberOfLines={1}>{m.to || m.shipper || '—'}</Text>
            </View>
            <Text style={styles.meta}>{m.count} đơn{m.status === 'Dispatched' || m.received ? ` · đã nhận ${m.received}/${m.count}` : ''} · {dt(m.createdAt)}{m.createdBy ? ' · ' + m.createdBy : ''}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="albums-outline" title="Chưa có bảng kê" text="Bấm “Tạo” để lập bảng kê trung chuyển hoặc bàn giao shipper" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 bảng kê gần nhất" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brand, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  addText: { color: '#fff', fontWeight: '700' },
  item: { backgroundColor: '#fff', padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 15, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12.5, color: colors.muted },
  route: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#F8FAFC', padding: 9, borderRadius: 10 },
  routeText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text2 },
  meta: { fontSize: 12, color: colors.faint, marginTop: 8 },
});
