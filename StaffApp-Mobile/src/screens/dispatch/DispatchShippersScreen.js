import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { colors, radius } from '../../theme';
import { ago, initials, matches, money, within } from '../../format';
import { Chips, ListState, SearchBar, call } from '../../components/ui';

export default function DispatchShippersScreen({ navigation }) {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const fn = useCallback(async () => (await staff.dispatchShippers()).items || [], []);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);

  const list = useMemo(() => {
    if (!data) return null;
    return data
      .map((s) => ({ ...s, isOnline: s.online || within(s.lastLocationAt, 30), load: (s.pickup || 0) + (s.delivery || 0) + (s.returns || 0) }))
      .filter((s) => (filter === 'online' ? s.isOnline : filter === 'offline' ? !s.isOnline : filter === 'cod' ? s.codHeld > 0 : true))
      .filter((s) => matches(q, s.name, s.code, s.phone, s.areas, s.warehouse, s.vehiclePlate))
      .sort((a, b) => (b.isOnline - a.isOnline) || (b.load - a.load));
  }, [data, q, filter]);
  const online = data ? data.filter((s) => s.online || within(s.lastLocationAt, 30)).length : undefined;
  const canDetail = can('dispatch.manage');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Tên, mã, SĐT, khu vực" />
        <Chips style={{ marginTop: 10 }} value={filter} onChange={setFilter} items={[
          { key: 'all', label: 'Tất cả', count: data?.length }, { key: 'online', label: 'Online', count: online },
          { key: 'offline', label: 'Offline' }, { key: 'cod', label: 'Đang giữ COD' },
        ]} />
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item: s }) => (
          <Pressable disabled={!canDetail} onPress={() => navigation.navigate('DispatchShipperDetail', { id: s.id, name: s.name })} style={styles.item}>
            <View>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(s.name)}</Text></View>
              <View style={[styles.dot, { backgroundColor: s.isOnline ? colors.success : '#CBD5E1' }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{s.name} <Text style={styles.code}>· {s.code}</Text></Text>
              <Text style={styles.sub} numberOfLines={1}>{s.areas || s.warehouse || 'Chưa gán khu vực'}</Text>
              <View style={styles.loadRow}>
                <Text style={styles.load}><Text style={styles.loadNum}>{s.pickup}</Text> lấy</Text>
                <Text style={styles.load}><Text style={styles.loadNum}>{s.delivery}</Text> giao</Text>
                <Text style={styles.load}><Text style={styles.loadNum}>{s.returns}</Text> hoàn</Text>
                <Text style={styles.load}><Text style={[styles.loadNum, { color: colors.success }]}>{s.deliveredToday}</Text> đã giao</Text>
              </View>
              <Text style={[styles.seen, s.isOnline && { color: colors.success }]}>{s.isOnline ? 'Online · ' : ''}Vị trí {ago(s.lastLocationAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              {s.codHeld > 0 ? <Text style={styles.cod}>{money(s.codHeld)}</Text> : null}
              <Pressable onPress={() => call(s.phone)} hitSlop={8} style={styles.callBtn}><Ionicons name="call" size={16} color={colors.success} /></Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="people-outline" title="Không có shipper phù hợp" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  item: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand600, fontWeight: '800' },
  dot: { position: 'absolute', right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  code: { fontSize: 12.5, color: colors.faint, fontWeight: '600' },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  loadRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  load: { fontSize: 12, color: colors.muted },
  loadNum: { fontWeight: '800', color: colors.text, fontSize: 13 },
  seen: { fontSize: 11.5, color: colors.faint, marginTop: 4 },
  cod: { fontSize: 13, fontWeight: '800', color: colors.warning },
  callBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
});
