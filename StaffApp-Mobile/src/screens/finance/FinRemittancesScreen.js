import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { staff } from '../../api';
import { useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { CaseBadge, Chips, ListFooter, ListState } from '../../components/ui';

export const REMIT_STATUS = [{ key: null, label: 'Tất cả' }, { key: 'Draft', label: 'Nháp' }, { key: 'Confirmed', label: 'Đã xác nhận' }, { key: 'Cancelled', label: 'Đã hủy' }];

export default function FinRemittancesScreen({ navigation, route }) {
  const [status, setStatus] = useState(route.params?.status ?? null);
  const fn = useCallback(async () => (await staff.finRemittances(status)).items || [], [status]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data, 30);
  const sum = (data || []).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Chips items={REMIT_STATUS} value={status} onChange={setStatus} />
        {data?.length ? <Text style={styles.sum}>{data.length} phiếu · {money(sum)}</Text> : null}
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: r }) => (
          <Pressable onPress={() => navigation.navigate('FinRemittanceDetail', { id: r.id })} style={styles.item}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.code}>{r.code}</Text>
                <CaseBadge status={r.status} text={r.statusText} />
              </View>
              <Text style={styles.sub}>{r.shipper} ({r.shipperCode}) · {r.count} đơn</Text>
              <Text style={styles.meta}>Lập {dt(r.createdAt)}{r.createdBy ? ' · ' + r.createdBy : ''}{r.confirmedAt ? ` · xác nhận ${dt(r.confirmedAt)}` : ''}</Text>
            </View>
            <Text style={styles.amt}>{money(r.amount)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="receipt-outline" title="Chưa có phiếu nộp" text="Lập phiếu từ mục Shipper giữ COD" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 phiếu gần nhất" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  sum: { fontSize: 12.5, color: colors.muted, marginTop: 8, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 15, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.text2, marginTop: 4 },
  meta: { fontSize: 11.5, color: colors.faint, marginTop: 3 },
  amt: { fontSize: 15.5, fontWeight: '800', color: colors.text },
});
