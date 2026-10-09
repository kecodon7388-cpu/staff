import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shipper } from '../../api';
import { colors } from '../../theme';
import { money } from '../../format';
import { Empty, Loading, Segmented } from '../../components/ui';
import TaskCard from '../../components/TaskCard';

const TYPES = [
  { key: 'pickup', label: 'Lấy hàng' },
  { key: 'delivery', label: 'Giao hàng' },
  { key: 'return', label: 'Trả hoàn' },
];

export default function TasksScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState(route.params?.type || 'delivery');
  const [items, setItems] = useState(null);
  const [counts, setCounts] = useState({});
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (route.params?.type) setType(route.params.type); }, [route.params?.type]);

  const load = useCallback(async (t = type) => {
    try {
      const [res, me] = await Promise.all([shipper.tasks(t), shipper.me()]);
      setItems(res.items || []);
      setCounts({ pickup: me.pickups, delivery: me.deliveries, return: me.returns });
      setError('');
    } catch (e) { setError(e.message); setItems((x) => x || []); }
  }, [type]);

  useFocusEffect(useCallback(() => { load(type); }, [load, type]));

  const changeType = (t) => { setType(t); setItems(null); };

  const filtered = useMemo(() => {
    if (!items) return null;
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((i) => [i.trackingCode, i.referenceCode, i.contactName, i.contactPhone, i.address]
      .some((v) => (v || '').toLowerCase().includes(k)));
  }, [items, q]);

  const totalCollect = (filtered || []).reduce((s, i) => s + (i.amountToCollect || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Nhiệm vụ</Text>
        <Segmented items={TYPES.map((t) => ({ ...t, count: counts[t.key] }))} value={type} onChange={changeType} />
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Tìm mã đơn, tên, SĐT, địa chỉ" placeholderTextColor={colors.faint} style={styles.searchInput} />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
          <Pressable onPress={() => navigation.navigate('Scan')} style={styles.scanBtn} hitSlop={6}><Ionicons name="barcode-outline" size={20} color={colors.brand} /></Pressable>
        </View>
        {type === 'delivery' && filtered && filtered.length > 0 ? (
          <Text style={styles.summary}>{filtered.length} đơn · cần thu {money(totalCollect)}</Text>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {filtered == null ? <Loading /> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => String(i.assignmentId)}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(type); setRefreshing(false); }} />}
          renderItem={({ item }) => <TaskCard item={item} onPress={() => navigation.navigate('Order', { id: item.orderId })} />}
          ListEmptyComponent={<Empty icon="checkmark-done-circle-outline" title={q ? 'Không tìm thấy đơn phù hợp' : 'Không còn việc nào'}
            text={q ? 'Thử từ khóa khác' : 'Kéo xuống để làm mới khi có đơn mới được phân công'} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12, letterSpacing: -0.4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#F1F5F9', borderRadius: 13, paddingLeft: 12, height: 46 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  scanBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E2E8F0' },
  summary: { marginTop: 10, fontSize: 13, color: colors.muted, fontWeight: '500' },
  error: { color: colors.danger, padding: 12, textAlign: 'center' },
});
