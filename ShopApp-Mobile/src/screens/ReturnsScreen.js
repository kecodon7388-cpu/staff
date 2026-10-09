import React, { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { colors, font, genericColor } from '../theme';
import { dt, money } from '../format';
import { Button, Card, Chip, ChipBar, Empty, ErrorBanner, Loading, StatusBadge, hapticError, hapticSuccess } from '../components/ui';

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'Pending', label: 'Chờ hoàn' },
  { key: 'Returning', label: 'Đang hoàn' },
  { key: 'AtReturnWarehouse', label: 'Tại kho hoàn' },
  { key: 'ReturnedToShop', label: 'Đã trả shop' },
  { key: 'Confirmed', label: 'Đã xác nhận' },
  { key: 'Cancelled', label: 'Đã hủy' },
];

export default function ReturnsScreen({ navigation }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(null);
  const { data, loading, refreshing, error, reload, refresh, silent } = useLoad(() => api.returns(status || undefined), [status], { refetchOnFocus: true });
  const items = data?.items || [];

  const confirm = (r) => Alert.alert('Xác nhận đã nhận hàng hoàn', `Shop đã nhận lại hàng của đơn ${r.trackingCode || r.code}?`, [
    { text: 'Chưa', style: 'cancel' },
    {
      text: 'Đã nhận hàng',
      onPress: async () => {
        setBusy(r.id);
        try {
          const res = await api.confirmReturn(r.id);
          hapticSuccess();
          Alert.alert('Thành công', res.message || 'Đã xác nhận');
          silent();
        } catch (e) { hapticError(); Alert.alert('Không xác nhận được', e.message); } finally { setBusy(null); }
      },
    },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <ChipBar>
        {FILTERS.map((f) => <Chip key={f.key || 'all'} label={f.label} active={status === f.key} onPress={() => setStatus(f.key)} />)}
      </ChipBar>
      <ErrorBanner message={error} onRetry={reload} style={{ marginHorizontal: 16, marginBottom: 8 }} />
      {loading && !data ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
          renderItem={({ item: r }) => (
            <Card onPress={r.orderId ? () => navigation.navigate('OrderDetail', { id: r.orderId }) : undefined} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>{r.trackingCode || r.code}</Text>
                  <Text style={font.tiny}>Mã hoàn {r.code}</Text>
                </View>
                <StatusBadge status={r.status} text={r.statusText} colorFn={genericColor} />
              </View>
              {r.receiver ? <Text style={[font.small, { marginTop: 6 }]}>Người nhận: {r.receiver}</Text> : null}
              {r.reason ? (
                <View style={styles.reason}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text2 }}>{r.reason}</Text>
                </View>
              ) : null}
              <View style={styles.bottom}>
                <Text style={font.small}>Phí hoàn: <Text style={{ fontWeight: '700', color: colors.text }}>{money(r.fee)}</Text></Text>
                {r.warehouse ? <Text style={font.small} numberOfLines={1}>Kho: {r.warehouse}</Text> : null}
                <Text style={[font.tiny, { marginLeft: 'auto' }]}>{dt(r.returnedAt || r.createdAt)}</Text>
              </View>
              {r.canConfirm ? (
                <Button title="Đã nhận hàng" icon="checkmark-done" variant="success" size="md" style={{ marginTop: 12 }}
                  onPress={() => confirm(r)} loading={busy === r.id} />
              ) : null}
            </Card>
          )}
          ListEmptyComponent={<Empty icon="return-down-back-outline" title="Không có hàng hoàn" text="Đơn giao không thành công và được chuyển hoàn sẽ hiển thị tại đây." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reason: { flexDirection: 'row', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 9, padding: 8, marginTop: 8 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
});
