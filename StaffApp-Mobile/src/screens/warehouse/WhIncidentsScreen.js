import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useLoad, usePaged } from '../../hooks';
import { caseColor, colors, radius } from '../../theme';
import { dtFull } from '../../format';
import { CaseBadge, Chips, ListFooter, ListState } from '../../components/ui';

export const INCIDENT_TYPES = [
  { key: 'Lost', label: 'Thất lạc', icon: 'help-buoy-outline' },
  { key: 'Damaged', label: 'Hư hỏng', icon: 'construct-outline' },
  { key: 'Found', label: 'Tìm thấy', icon: 'checkmark-done-outline' },
];

export default function WhIncidentsScreen({ navigation }) {
  const [type, setType] = useState(null);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('WhIncidentCreate')} hitSlop={8} style={styles.add}>
          <Ionicons name="add" size={20} color="#fff" /><Text style={styles.addText}>Ghi nhận</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const fn = useCallback(async () => (await staff.whIncidents()).items || [], []);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const filtered = useMemo(() => (data ? data.filter((x) => !type || x.type === type) : null), [data, type]);
  const { list, more, loadMore, total } = usePaged(filtered, 30);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Chips value={type} onChange={setType} items={[{ key: null, label: 'Tất cả', count: data?.length },
          ...INCIDENT_TYPES.map((t) => ({ ...t, count: data ? data.filter((x) => x.type === t.key).length : undefined }))]} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: x }) => {
          const c = caseColor(x.type);
          return (
            <Pressable onPress={() => x.orderId && navigation.navigate('StaffOrderDetail', { id: x.orderId })} style={styles.item}>
              <View style={[styles.icon, { backgroundColor: c.bg }]}><Ionicons name={INCIDENT_TYPES.find((t) => t.key === x.type)?.icon || 'warning-outline'} size={18} color={c.fg} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.code}>{x.trackingCode}</Text>
                  <CaseBadge status={x.type} text={x.typeText} />
                </View>
                {x.note ? <Text style={styles.note}>{x.note}</Text> : null}
                <Text style={styles.meta}>{[x.warehouse, dtFull(x.createdAt), x.by].filter(Boolean).join(' · ')}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="shield-checkmark-outline" title="Chưa có sự cố" text="Thất lạc, hư hỏng, tìm thấy hàng sẽ hiện ở đây" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 sự cố gần nhất" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.brand, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  addText: { color: '#fff', fontWeight: '700' },
  item: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  note: { fontSize: 13, color: colors.text2, marginTop: 4 },
  meta: { fontSize: 11.5, color: colors.faint, marginTop: 4 },
});
