/** Dashboard điều hành – GET /api/staff/dashboard (kpi, days[14], byService, alerts). Biểu đồ dựng bằng View. */
import React, { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { colors } from '../../theme';
import { date, money, moneyShort, num } from '../../format';
import { BarChart, Card, ErrorBox, HBar, ListState, NavyHeader, SectionTitle, Stat } from '../../components/ui';

export default function DashboardScreen({ navigation, route, embedded }) {
  const { canReadOrders, can } = useAuth();
  const fn = useCallback(() => staff.dashboard(), []);
  const { data: d, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const k = d?.kpi;
  const open = (id) => canReadOrders && navigation.navigate('StaffOrderDetail', { id });
  const lookup = (status) => (canReadOrders ? () => navigation.navigate('OrderLookup', { status }) : undefined);
  const maxSvc = Math.max(1, ...(d?.byService || []).map((x) => x.count));

  const content = <ListState loading={loading} error={error} onRetry={reload} />;

  const charts = d ? (
    <>
      <SectionTitle title="14 ngày gần nhất" />
      <Card>
        <BarChart data={(d.days || []).map((x) => ({ ...x, label: x.day.slice(0, 2) }))}
          series={[{ key: 'created', label: 'Đơn tạo', color: colors.brand }, { key: 'delivered', label: 'Đã giao', color: colors.success }]} />
        <Text style={styles.note}>
          Tổng 14 ngày: {num((d.days || []).reduce((s, x) => s + x.created, 0))} đơn tạo · {num((d.days || []).reduce((s, x) => s + x.delivered, 0))} đơn giao
        </Text>
      </Card>
      {(d.byService || []).length ? (
        <>
          <SectionTitle title="Đơn theo dịch vụ (tháng)" />
          <Card>{d.byService.map((s, i) => <HBar key={i} label={s.name || 'Khác'} value={s.count} max={maxSvc} color={[colors.brand, colors.violet, colors.info, colors.success, colors.warning][i % 5]} right={num(s.count)} />)}</Card>
        </>
      ) : null}

      <SectionTitle title="Cảnh báo" />
      <Alert title={`Lưu kho quá ${d.alerts?.storageDays} ngày`} icon="alarm-outline" color={colors.danger} items={d.alerts?.stuck}
        render={(x) => <AlertRow key={x.id} onPress={() => open(x.id)} left={x.trackingCode} sub={x.warehouse} right={'từ ' + date(x.since)} />} />
      <Alert title="Giao lỗi nhiều lần" icon="repeat-outline" color={colors.warning} items={d.alerts?.multiFail}
        render={(x) => <AlertRow key={x.id} onPress={() => open(x.id)} left={x.trackingCode} sub={x.reason} right={`${x.attempts} lần`} />} />
      <Alert title="Shipper giữ COD vượt ngưỡng" icon="wallet-outline" color={colors.warning} items={d.alerts?.codHeld}
        render={(x) => <AlertRow key={x.shipperId} onPress={can('cod.manage') ? () => navigation.navigate('FinHolderDetail', { shipperId: x.shipperId }) : null} left={x.name} right={money(x.amount)} />} />
    </>
  ) : null;

  const full = !d ? content : (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      {error ? <ErrorBox text={error} onRetry={reload} style={{ marginBottom: 12 }} /> : null}
      <SectionTitle title="Hôm nay" style={{ marginTop: 0 }} />
      <View style={styles.grid}>
        <Stat icon="add-circle-outline" label="Đơn mới hôm nay" value={num(k.newToday)} />
        <Stat icon="checkmark-circle-outline" color={colors.success} bg={colors.successBg} label="Giao thành công hôm nay" value={num(k.deliveredToday)} onPress={lookup('Delivered')} />
        <Stat icon="cube-outline" color={colors.info} bg={colors.infoBg} label="Chờ lấy hàng" value={num(k.awaitingPickup)} onPress={lookup('AwaitingPickup')} />
        <Stat icon="business-outline" color={colors.violet} bg={colors.violetBg} label="Trong kho / trung chuyển" value={num(k.inWarehouse)} onPress={lookup('InWarehouse')} />
        <Stat icon="bicycle-outline" label="Đang giao" value={num(k.delivering)} onPress={lookup('Delivering')} />
        <Stat icon="close-circle-outline" color={colors.danger} bg={colors.dangerBg} label="Giao lỗi / hẹn lại" value={num(k.failed)} alert={k.failed > 0} onPress={lookup('DeliveryFailed')} />
        <Stat icon="return-down-back-outline" color={colors.warning} bg={colors.warningBg} label="Đang hoàn" value={num(k.returning)} onPress={lookup('Returning')} />
        <Stat icon="chatbubbles-outline" color={colors.warning} bg={colors.warningBg} label="Khiếu nại đang mở" value={num(k.openComplaints)} />
      </View>
      <SectionTitle title="Tháng này" />
      <View style={styles.grid}>
        <Stat icon="layers-outline" label="Đơn trong tháng" value={num(k.ordersMonth)} />
        <Stat icon="trending-up-outline" color={colors.success} bg={colors.successBg} label="Tỉ lệ giao thành công" value={`${k.successRateMonth}%`} />
        <Stat icon="cash-outline" color={colors.success} bg={colors.successBg} label="Doanh thu cước" value={moneyShort(k.revenueMonth)} />
        <Stat icon="wallet-outline" color={colors.warning} bg={colors.warningBg} label="COD shipper giữ" value={moneyShort(k.codHeldByShipper)} onPress={can('cod.manage') ? () => navigation.navigate('FinHolders') : undefined} />
        <Stat icon="arrow-up-circle-outline" color={colors.danger} bg={colors.dangerBg} label="COD phải trả shop" value={moneyShort(k.codToPay)} />
      </View>
      {charts}
    </ScrollView>
  );

  if (!embedded) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{full}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavyHeader title="Dashboard điều hành" sub="Số liệu theo phạm vi của bạn" back={route.name.endsWith('Hub')} onBack={() => navigation.goBack()} />
      {full}
    </View>
  );
}

function Alert({ title, icon, color, items, render }) {
  return (
    <Card style={{ marginBottom: 10 }} padded={false}>
      <View style={styles.aHead}>
        <Ionicons name={icon} size={17} color={color} />
        <Text style={styles.aTitle}>{title}</Text>
        <Text style={[styles.aCount, { color: items?.length ? color : colors.faint }]}>{items?.length || 0}</Text>
      </View>
      {items?.length ? items.map(render) : <Text style={styles.aNone}>Không có</Text>}
    </Card>
  );
}

const AlertRow = ({ left, sub, right, onPress }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={styles.aRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.aLeft}>{left}</Text>
      {sub ? <Text style={styles.aSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
    <Text style={styles.aRight}>{right}</Text>
    {onPress ? <Ionicons name="chevron-forward" size={15} color={colors.faint} /> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  note: { fontSize: 12, color: colors.muted, marginTop: 10, textAlign: 'center' },
  aHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  aTitle: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.text },
  aCount: { fontSize: 15, fontWeight: '800' },
  aNone: { padding: 12, color: colors.faint, fontSize: 13 },
  aRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F6FA' },
  aLeft: { fontSize: 14, fontWeight: '700', color: colors.text },
  aSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  aRight: { fontSize: 13, fontWeight: '700', color: colors.text2 },
});
