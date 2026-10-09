import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { date, money } from '../../format';
import { Chips, ErrorBox, ListFooter, ListState, SearchBar } from '../../components/ui';
import { WarehouseField } from '../../components/PickField';
import { ScanModal } from '../../components/Scanner';

export default function WhInventoryScreen({ navigation, route }) {
  const [wh, setWh] = useState(null);
  const [overdue, setOverdue] = useState(!!route.params?.overdue);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [scan, setScan] = useState(false);

  const fn = useCallback(() => staff.whInventory({ warehouseId: wh?.id, overdue, q: query }), [wh, overdue, query]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore } = usePaged(data?.items, 40);
  const alertDays = data?.alertDays ?? 0;

  const header = (
    <View style={styles.top}>
      <WarehouseField value={wh?.id} onChange={setWh} allowClear label={null} style={{ marginBottom: 10 }} />
      <SearchBar value={q} onChangeText={setQ} onSubmit={(v) => setQuery(typeof v === 'string' ? v : q)} placeholder="Tìm mã vận đơn" onScan={() => setScan(true)} />
      <Chips style={{ marginTop: 10 }} value={overdue ? 'over' : 'all'} onChange={(k) => setOverdue(k === 'over')}
        items={[{ key: 'all', label: 'Tất cả', count: !overdue ? data?.total : undefined }, { key: 'over', label: `Quá ${alertDays || '…'} ngày`, icon: 'alarm-outline', count: overdue ? data?.total : undefined }]} />
      {!wh && data?.summary?.length ? (
        <Chips style={{ marginTop: 8 }} value={null} onChange={(id) => setWh({ id })}
          items={data.summary.map((s) => ({ key: s.warehouseId, label: s.name, count: s.count }))} />
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      {error && data ? <ErrorBox text={error} onRetry={reload} style={{ margin: 12, marginBottom: 0 }} /> : null}
      <FlatList
        data={list || []}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item: o }) => {
          const warn = !o.overdue && alertDays > 0 && o.days >= alertDays - 1;
          const c = o.overdue ? colors.danger : warn ? colors.warning : colors.success;
          const bg = o.overdue ? colors.dangerBg : warn ? colors.warningBg : colors.successBg;
          return (
            <Pressable onPress={() => navigation.navigate('StaffOrderDetail', { id: o.id })} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.9 : 1 }]}>
              <View style={[styles.days, { backgroundColor: bg }]}>
                <Text style={[styles.daysNum, { color: c }]}>{o.days}</Text>
                <Text style={[styles.daysLbl, { color: c }]}>ngày</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{o.trackingCode}</Text>
                <Text style={styles.sub} numberOfLines={1}>{[o.warehouse, o.location ? 'Ô ' + o.location : null].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.sub} numberOfLines={1}>{[o.statusText, o.shop, o.province].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                {o.codAmount > 0 ? <Text style={styles.cod}>{money(o.codAmount)}</Text> : null}
                <Text style={styles.since}>từ {date(o.since)}</Text>
                {o.hasShipper ? <Ionicons name="bicycle" size={15} color={colors.brand} /> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<ListState loading={loading && !data} error={!data ? error : ''} onRetry={reload} icon="layers-outline"
          title={overdue ? 'Không có đơn lưu kho quá hạn' : 'Kho trống'} text={query ? 'Thử mã khác' : null} />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={data?.items?.length || 0}
          note={data && data.total > (data.items?.length || 0) ? `tổng ${data.total} đơn – lọc thêm để thu hẹp` : null} />}
      />
      <ScanModal visible={scan} onClose={() => setScan(false)} onCode={(c) => { setQ(c); setQuery(c); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  days: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  daysNum: { fontSize: 19, fontWeight: '800' },
  daysLbl: { fontSize: 10.5, fontWeight: '700', marginTop: -2 },
  code: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  cod: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  since: { fontSize: 11.5, color: colors.faint },
});
