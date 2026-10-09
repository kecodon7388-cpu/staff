import React, { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../api';
import { useAuth } from '../auth';
import { useLoad, usePaged } from '../hooks';
import { colors, radius } from '../theme';
import { ago, dtFull } from '../format';
import { ListFooter, ListState } from '../components/ui';

export default function NotificationsScreen({ navigation }) {
  const { canReadOrders, has, setUnread } = useAuth();
  const fn = useCallback(async () => {
    const r = await staff.notifications(); // máy chủ đánh dấu đã đọc khi tải danh sách
    setUnread(0);
    return r.items || [];
  }, [setUnread]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { list, more, loadMore, total } = usePaged(data, 30);

  const open = (n) => {
    if (!n.orderId) return;
    if (canReadOrders) navigation.navigate('StaffOrderDetail', { id: n.orderId });
    else if (has('shipper')) navigation.navigate('Order', { id: n.orderId });
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={list || []}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      renderItem={({ item: n }) => (
        <Pressable onPress={() => open(n)} disabled={!n.orderId} style={({ pressed }) => [styles.item, !n.isRead && styles.unread, { opacity: pressed ? 0.9 : 1 }]}>
          <View style={[styles.icon, !n.isRead && { backgroundColor: colors.brand }]}>
            <Ionicons name={n.orderId ? 'cube-outline' : 'notifications-outline'} size={18} color={n.isRead ? colors.muted : '#fff'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !n.isRead && { color: colors.text }]}>{n.title}</Text>
            {n.content ? <Text style={styles.content}>{n.content}</Text> : null}
            <Text style={styles.time}>{ago(n.createdAt)} · {dtFull(n.createdAt)}</Text>
          </View>
          {n.orderId ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
        </Pressable>
      )}
      ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="notifications-off-outline" title="Chưa có thông báo" />}
      ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="100 thông báo gần nhất" />}
    />
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fff', padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  unread: { borderColor: colors.brand100, backgroundColor: '#F8FBFF' },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontWeight: '700', color: colors.text2 },
  content: { fontSize: 13.5, color: colors.muted, marginTop: 3, lineHeight: 19 },
  time: { fontSize: 11.5, color: colors.faint, marginTop: 6 },
});
