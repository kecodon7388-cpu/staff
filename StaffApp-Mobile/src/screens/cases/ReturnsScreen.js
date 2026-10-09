import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { staff } from '../../api';
import { useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { CaseBadge, Chips, ListFooter, ListState, SearchBar } from '../../components/ui';
import { ScanModal } from '../../components/Scanner';

export default function ReturnsScreen({ navigation, route }) {
  const [status, setStatus] = useState(route.params?.status ?? null);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [scan, setScan] = useState(false);
  const fn = useCallback(() => staff.returns({ status, q: query }), [status, query]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data?.items, 30);

  const chips = [{ key: null, label: 'Đang xử lý' }, ...(data?.counts || []).map((c) => ({ key: c.status, label: c.statusText, count: c.count }))];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <SearchBar value={q} onChangeText={setQ} onSubmit={(v) => setQuery(typeof v === 'string' ? v : q)} placeholder="Mã hoàn / mã vận đơn" onScan={() => setScan(true)} />
        <Chips style={{ marginTop: 10 }} items={chips} value={status} onChange={setStatus} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: r }) => (
          <Pressable onPress={() => navigation.navigate('ReturnDetail', { id: r.id })} style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.code}>{r.trackingCode}</Text>
              <CaseBadge status={r.status} text={r.statusText} />
              {r.isAuto ? <Text style={styles.auto}>Tự động</Text> : null}
            </View>
            <Text style={styles.reason} numberOfLines={2}>{r.reason || 'Không ghi lý do'}</Text>
            <Text style={styles.meta} numberOfLines={1}>{[r.code, r.shop, r.warehouse, r.shipper ? 'Shipper ' + r.shipper : null].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.meta}>{dt(r.createdAt)}{r.fee ? ' · phí hoàn ' + money(r.fee) : ''}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="return-down-back-outline" title="Không có yêu cầu hoàn" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 yêu cầu gần nhất" />}
      />
      <ScanModal visible={scan} onClose={() => setScan(false)} onCode={(c) => { setQ(c); setQuery(c); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  item: { backgroundColor: '#fff', padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  auto: { marginLeft: 'auto', fontSize: 11, fontWeight: '700', color: colors.violet },
  reason: { fontSize: 13.5, color: colors.text2, marginTop: 6 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
