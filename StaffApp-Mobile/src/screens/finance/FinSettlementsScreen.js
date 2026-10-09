import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { date, money } from '../../format';
import { CaseBadge, Chips, ListFooter, ListState, SearchBar } from '../../components/ui';

export const SETTLE_STATUS = [{ key: null, label: 'Tất cả' }, { key: 'Draft', label: 'Nháp' }, { key: 'Confirmed', label: 'Đã xác nhận' }, { key: 'Paid', label: 'Đã thanh toán' }, { key: 'Cancelled', label: 'Đã hủy' }];

export default function FinSettlementsScreen({ navigation, route }) {
  const { can } = useAuth();
  const [status, setStatus] = useState(route.params?.status ?? null);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: can('cod.manage') ? () => (
        <Pressable onPress={() => navigation.navigate('FinSettlementGenerate')} hitSlop={8} style={styles.add}>
          <Ionicons name="add" size={20} color="#fff" /><Text style={styles.addText}>Lập</Text>
        </Pressable>
      ) : undefined,
    });
  }, [navigation, can]);

  const fn = useCallback(async () => (await staff.finSettlements({ status, q: query })).items || [], [status, query]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data, 30);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <SearchBar value={q} onChangeText={setQ} onSubmit={(v) => setQuery(typeof v === 'string' ? v : q)} placeholder="Mã bảng, tên / mã shop" />
        <Chips style={{ marginTop: 10 }} items={SETTLE_STATUS} value={status} onChange={setStatus} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: s }) => (
          <Pressable onPress={() => navigation.navigate('FinSettlementDetail', { id: s.id })} style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.code}>{s.code}</Text>
              <CaseBadge status={s.status} text={s.statusText} />
              <Text style={[styles.net, { color: s.net >= 0 ? colors.success : colors.danger }]}>{money(s.net)}</Text>
            </View>
            <Text style={styles.shop} numberOfLines={1}>{s.shop} <Text style={styles.faint}>· {s.shopCode}</Text></Text>
            <Text style={styles.meta}>Kỳ {date(s.from)} – {date(s.to)} · {s.count} đơn · COD {money(s.totalCod)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="git-compare-outline" title="Chưa có bảng đối soát" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 bảng gần nhất" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brand, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  addText: { color: '#fff', fontWeight: '700' },
  item: { backgroundColor: '#fff', padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 15, fontWeight: '800', color: colors.text },
  net: { marginLeft: 'auto', fontSize: 15, fontWeight: '800' },
  shop: { fontSize: 14, fontWeight: '600', color: colors.text2, marginTop: 6 },
  faint: { color: colors.faint, fontWeight: '500' },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
