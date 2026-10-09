import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { shipper } from '../../api';
import { colors, radius } from '../../theme';
import { dt, money } from '../../format';
import { Badge, Card, Empty, Loading, SectionTitle } from '../../components/ui';

export default function CodScreen({ navigation }) {
  const [d, setD] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setD(await shipper.cod()); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!d) return error ? <Text style={{ padding: 24, color: colors.danger, textAlign: 'center' }}>{error}</Text> : <Loading />;

  const header = (
    <View>
      <View style={[styles.hero, { paddingTop: 12 }]}>
        <View style={styles.glow} />
        <Text style={styles.heroLabel}>Tiền COD đang giữ</Text>
        <Text style={styles.heroValue}>{money(d.totalHeld)}</Text>
        <Text style={styles.heroSub}>{d.held.length} đơn · nộp tiền tại bưu cục để kế toán xác nhận</Text>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle title="Đơn đã thu tiền, chưa nộp" />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <FlatList
        data={d.held}
        keyExtractor={(i) => String(i.orderId)}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor="#fff" onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('Order', { id: item.orderId })} style={styles.item}>
            <View style={styles.itemIcon}><Ionicons name="cash" size={18} color={colors.success} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemCode}>{item.trackingCode}</Text>
              <Text style={styles.itemSub}>{item.receiver} · {dt(item.deliveredAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.itemAmt}>{money(item.amount)}</Text>
              {item.inRemittance ? <Badge text="Đã lập phiếu nộp" fg={colors.info} bg={colors.infoBg} /> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Empty icon="wallet-outline" title="Không giữ tiền COD nào" text="Các đơn giao thành công có thu tiền sẽ hiện ở đây" />}
        ListFooterComponent={(
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Lịch sử nộp tiền" />
            {d.remittances.length === 0 ? <Card><Text style={{ color: colors.muted, textAlign: 'center' }}>Chưa có phiếu nộp</Text></Card> : (
              <Card padded={false}>
                {d.remittances.map((r, i) => (
                  <View key={r.code} style={[styles.rem, i < d.remittances.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCode}>{r.code}</Text>
                      <Text style={styles.itemSub}>{r.orderCount} đơn · {dt(r.createdAt)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.itemAmt}>{money(r.totalAmount)}</Text>
                      <Badge text={r.statusText} fg={r.status === 'Confirmed' ? colors.success : r.status === 'Cancelled' ? colors.muted : colors.warning}
                        bg={r.status === 'Confirmed' ? colors.successBg : r.status === 'Cancelled' ? '#E2E8F0' : colors.warningBg} />
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, paddingHorizontal: 20, paddingBottom: 28, overflow: 'hidden' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#16A34A', opacity: 0.25, top: -120, right: -100 },
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  itemIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.successBg, alignItems: 'center', justifyContent: 'center' },
  itemCode: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  itemSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  itemAmt: { fontSize: 15, fontWeight: '800', color: colors.text },
  rem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
});
