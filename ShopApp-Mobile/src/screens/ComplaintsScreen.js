import React, { useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { colors, font, genericColor } from '../theme';
import { dt, money } from '../format';
import { Card, Chip, ChipBar, Empty, ErrorBanner, Loading, StatusBadge } from '../components/ui';

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'New', label: 'Mới' },
  { key: 'Processing', label: 'Đang xử lý' },
  { key: 'WaitingApproval', label: 'Chờ duyệt' },
  { key: 'Approved', label: 'Đã duyệt' },
  { key: 'Rejected', label: 'Từ chối' },
  { key: 'Closed', label: 'Đã đóng' },
];

export default function ComplaintsScreen({ navigation }) {
  const [status, setStatus] = useState('');
  const { data, loading, refreshing, error, reload, refresh } = useLoad(() => api.complaints(status || undefined), [status], { refetchOnFocus: true });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('CreateComplaint')} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="add-circle" size={22} color={colors.brand600} />
          <Text style={{ color: colors.brand600, fontWeight: '700' }}>Gửi mới</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const items = data?.items || [];
  return (
    <View style={{ flex: 1 }}>
      <ChipBar>
        {FILTERS.map((f) => <Chip key={f.key || 'all'} label={f.label} active={status === f.key} onPress={() => setStatus(f.key)} />)}
      </ChipBar>
      <ErrorBanner message={error} onRetry={reload} style={{ marginHorizontal: 16, marginBottom: 8 }} />
      {loading && !data ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
          renderItem={({ item: c }) => (
            <Card onPress={() => navigation.navigate('ComplaintDetail', { id: c.id })} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[font.h3, { flex: 1 }]}>{c.code}</Text>
                <StatusBadge status={c.status} text={c.statusText} colorFn={genericColor} />
              </View>
              <Text style={[font.body, { marginTop: 4, fontWeight: '600' }]} numberOfLines={2}>{c.title}</Text>
              <Text style={[font.small, { marginTop: 3 }]}>{c.typeText}{c.trackingCode ? ' · Đơn ' + c.trackingCode : ''}</Text>
              <View style={styles.bottom}>
                {c.requested ? <Text style={font.small}>Yêu cầu: <Text style={styles.amt}>{money(c.requested)}</Text></Text> : null}
                {c.compensation ? <Text style={font.small}>Bồi thường: <Text style={[styles.amt, { color: colors.success }]}>{money(c.compensation)}</Text></Text> : null}
                <Text style={[font.tiny, { marginLeft: 'auto' }]}>{dt(c.createdAt)}</Text>
              </View>
            </Card>
          )}
          ListEmptyComponent={(
            <Empty icon="chatbubbles-outline" title="Chưa có khiếu nại" text="Gửi khiếu nại khi hàng bị mất, hư hỏng, thiếu hoặc COD sai lệch." />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  amt: { fontWeight: '700', color: colors.text },
});
