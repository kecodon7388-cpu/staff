import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useDebounced } from '../hooks';
import { colors } from '../theme';
import { Chip, ChipBar, Empty, ErrorBanner, HeaderIconButton, Loading, NavyHeader } from '../components/ui';
import OrderCard from '../components/OrderCard';

export default function OrdersScreen({ navigation, route }) {
  const focused = useIsFocused();
  const [tab, setTab] = useState(route.params?.tab || '');
  const [q, setQ] = useState('');
  const dq = useDebounced(q.trim(), 450);
  const [tabs, setTabs] = useState([]);
  const [all, setAll] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const listRef = useRef(null);
  const firstFocus = useRef(true);

  // Nhận tab từ Trang chủ
  useEffect(() => {
    if (route.params?.tab !== undefined) setTab(route.params.tab || '');
  }, [route.params?.tab, route.params?.ts]);

  const load = useCallback(async (mode = 'load', pg = 1) => {
    const my = ++seq.current;
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'more') setLoadingMore(true);
    else if (mode === 'load') setLoading(true);
    try {
      const res = await api.orders({ tab: tab || undefined, q: dq || undefined, page: pg, pageSize: 30 });
      if (my !== seq.current) return;
      setTabs(res.tabs || []);
      setAll(res.all ?? 0);
      setTotal(res.total ?? 0);
      setHasMore(!!res.hasMore);
      setPage(pg);
      setItems((prev) => (pg === 1 ? res.items || [] : [...prev, ...(res.items || []).filter((x) => !prev.some((p) => p.id === x.id))]));
      setError('');
    } catch (e) {
      if (my === seq.current) setError(e.message);
    } finally {
      if (my === seq.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }
  }, [tab, dq]);

  useEffect(() => {
    load('load', 1);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [load]);

  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    load('silent', 1);
  }, [load]));

  const loadMore = () => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    load('more', page + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {focused ? <StatusBar style="light" /> : null}
      <NavyHeader
        subtitle={total ? `${total} đơn${tab ? ' trong mục này' : ''}` : 'Quản lý vận đơn'}
        title="Đơn hàng"
        right={<HeaderIconButton icon="scan-outline" onPress={() => navigation.navigate('Scan')} />}
      >
        <View style={styles.search}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput value={q} onChangeText={setQ} placeholder="Mã vận đơn, SĐT, tên người nhận..." placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.searchInput} autoCorrect={false} returnKeyType="search" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" /></Pressable> : null}
        </View>
      </NavyHeader>

      <View>
        <ChipBar>
          <Chip label="Tất cả" count={all ?? undefined} active={!tab} onPress={() => setTab('')} />
          {tabs.map((t) => (
            <Chip key={t.key} label={t.name} count={t.count} active={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ChipBar>
      </View>

      <ErrorBanner message={error} onRetry={() => load('load', 1)} style={{ marginHorizontal: 16, marginBottom: 8 }} />

      {loading && !items.length ? <Loading /> : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(o) => String(o.id)}
          renderItem={({ item }) => <OrderCard o={item} onPress={() => navigation.navigate('OrderDetail', { id: item.id })} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 2, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh', 1)} tintColor={colors.brand} colors={[colors.brand]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
            : (!hasMore && items.length > 10 ? <Text style={styles.end}>Đã hiển thị tất cả {items.length} đơn</Text> : null)}
          ListEmptyComponent={!error ? (
            <Empty icon="cube-outline" title={dq ? 'Không tìm thấy đơn phù hợp' : 'Chưa có đơn hàng'}
              text={dq ? 'Thử tìm bằng mã vận đơn, số điện thoại hoặc tên người nhận khác.' : 'Bấm nút + để tạo đơn hàng đầu tiên.'} />
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 12, height: 46, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  end: { textAlign: 'center', color: colors.faint, fontSize: 12.5, marginVertical: 14 },
});
