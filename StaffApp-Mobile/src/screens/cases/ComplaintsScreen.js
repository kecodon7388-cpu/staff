import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { CaseBadge, Chips, ListFooter, ListState, SearchBar } from '../../components/ui';

export const COMPLAINT_STATUS = [
  { key: 'New', label: 'Mới' }, { key: 'Assigned', label: 'Đã phân công' }, { key: 'Processing', label: 'Đang xử lý' },
  { key: 'WaitingApproval', label: 'Chờ duyệt' }, { key: 'Approved', label: 'Đã duyệt' }, { key: 'Rejected', label: 'Từ chối' }, { key: 'Closed', label: 'Đã đóng' },
];
const SCOPES = ['open', 'mine', 'all'];

export default function ComplaintsScreen({ navigation, route }) {
  const { canAny } = useAuth();
  const initial = route.params?.status || route.params?.scope || 'open';
  const [filter, setFilter] = useState(initial);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canAny('complaints.create', 'complaints.manage') ? () => (
        <Pressable onPress={() => navigation.navigate('ComplaintCreate')} hitSlop={8} style={styles.add}>
          <Ionicons name="add" size={20} color="#fff" /><Text style={styles.addText}>Tạo</Text>
        </Pressable>
      ) : undefined,
    });
  }, [navigation, canAny]);

  const fn = useCallback(() => {
    const isScope = SCOPES.includes(filter);
    return staff.complaints({ scope: isScope ? filter : 'all', status: isScope ? undefined : filter, q: query });
  }, [filter, query]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data?.items, 30);
  const c = data?.counts;

  const chips = [
    { key: 'open', label: 'Đang mở', count: c?.open },
    { key: 'mine', label: 'Của tôi', icon: 'person-outline' },
    ...COMPLAINT_STATUS.map((s) => ({ ...s, count: s.key === 'New' ? c?.isNew : s.key === 'WaitingApproval' ? c?.waitingApproval : undefined })),
    { key: 'all', label: 'Tất cả' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <SearchBar value={q} onChangeText={setQ} onSubmit={(v) => setQuery(typeof v === 'string' ? v : q)} placeholder="Mã KN, tiêu đề, mã vận đơn, shop" />
        <Chips style={{ marginTop: 10 }} items={chips} value={filter} onChange={setFilter} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: x }) => (
          <Pressable onPress={() => navigation.navigate('ComplaintDetail', { id: x.id })} style={styles.item}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.code}>{x.code}</Text>
              <CaseBadge status={x.status} text={x.statusText} />
              <Text style={[styles.age, x.ageHours > 48 && x.status !== 'Closed' && { color: colors.danger }]}>
                {x.ageHours < 24 ? `${x.ageHours} giờ` : `${Math.floor(x.ageHours / 24)} ngày`}
              </Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{x.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{[x.typeText, x.shop, x.trackingCode].filter(Boolean).join(' · ')}</Text>
            <View style={styles.bottom}>
              <Text style={styles.meta}>{x.assignedTo ? 'Phụ trách: ' + x.assignedTo : 'Chưa phân công'} · {dt(x.createdAt)}</Text>
              {x.compensation > 0 || x.requested > 0 ? (
                <Text style={styles.money}>{x.compensation > 0 ? 'BT ' + money(x.compensation) : 'YC ' + money(x.requested)}</Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="chatbubbles-outline" title="Không có khiếu nại" text={query ? 'Thử từ khóa khác' : null} />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 khiếu nại gần nhất" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brand, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  addText: { color: '#fff', fontWeight: '700' },
  item: { backgroundColor: '#fff', padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  age: { marginLeft: 'auto', fontSize: 12, color: colors.faint, fontWeight: '600' },
  title: { fontSize: 14.5, fontWeight: '600', color: colors.text, marginTop: 6 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3, flexShrink: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  money: { fontSize: 13, fontWeight: '700', color: colors.warning, marginTop: 3 },
});
