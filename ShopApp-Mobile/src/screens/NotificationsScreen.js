import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { colors, font } from '../theme';
import { dt } from '../format';
import { Card, Empty, ErrorBanner, Loading } from '../components/ui';

export default function NotificationsScreen({ navigation }) {
  // Lưu ý: máy chủ tự đánh dấu "đã đọc" sau khi trả danh sách → giữ trạng thái chưa đọc của lần tải đầu để hiển thị
  const { data, loading, refreshing, error, reload, refresh } = useLoad(() => api.notifications(), []);
  const items = data?.items || [];

  if (loading && !data) return <Loading />;
  return (
    <FlatList
      data={items}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
      ListHeaderComponent={<ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 10 }} />}
      renderItem={({ item: n }) => (
        <Card onPress={n.orderId ? () => navigation.navigate('OrderDetail', { id: n.orderId }) : undefined}
          style={[{ marginBottom: 10, flexDirection: 'row', gap: 12 }, !n.isRead && styles.unread]}>
          <View style={[styles.icon, { backgroundColor: n.isRead ? '#EEF2F7' : colors.brand100 }]}>
            <Ionicons name={n.orderId ? 'cube' : 'notifications'} size={18} color={n.isRead ? colors.muted : colors.brand600} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[font.h3, { flex: 1, fontSize: 15 }]} numberOfLines={2}>{n.title}</Text>
              {!n.isRead ? <View style={styles.dot} /> : null}
            </View>
            {n.content ? <Text style={[font.small, { marginTop: 3, lineHeight: 18 }]}>{n.content}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Text style={font.tiny}>{dt(n.createdAt)}</Text>
              {n.trackingCode ? <Text style={styles.code}>{n.trackingCode}</Text> : null}
            </View>
          </View>
        </Card>
      )}
      ListEmptyComponent={<Empty icon="notifications-off-outline" title="Chưa có thông báo" />}
    />
  );
}

const styles = StyleSheet.create({
  unread: { borderColor: colors.brand100, backgroundColor: '#FBFFFE' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand },
  code: { fontSize: 11.5, fontWeight: '700', color: colors.brand600, backgroundColor: colors.brand50, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
});
