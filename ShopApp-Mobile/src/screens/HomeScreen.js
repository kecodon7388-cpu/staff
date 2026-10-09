import React, { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuth } from '../auth';
import { useLoad } from '../hooks';
import { colors, font, shadow } from '../theme';
import { greeting, money, shortMoney } from '../format';
import { Card, Empty, ErrorBanner, HeaderIconButton, Loading, NavyHeader, Notice, SectionTitle, StatusBadge } from '../components/ui';

const STATS = [
  { key: 'draft', tab: 'draft', label: 'Chưa chốt', icon: 'create-outline', fg: colors.slate, bg: colors.slateBg },
  { key: 'awaitingPickup', tab: 'pickup', label: 'Chờ lấy hàng', icon: 'cube-outline', fg: colors.info, bg: colors.infoBg },
  { key: 'inTransit', tab: 'transit', label: 'Vận chuyển', icon: 'swap-horizontal', fg: colors.violet, bg: colors.violetBg },
  { key: 'delivering', tab: 'delivering', label: 'Đang giao', icon: 'bicycle-outline', fg: colors.blue, bg: colors.blueBg },
  { key: 'needAction', tab: 'issue', label: 'Cần xử lý', icon: 'alert-circle-outline', fg: colors.danger, bg: colors.dangerBg },
  { key: 'returning', tab: 'returns', label: 'Đang hoàn', icon: 'return-down-back-outline', fg: colors.warning, bg: colors.warningBg },
];

export default function HomeScreen({ navigation }) {
  const { profile, updateProfile } = useAuth();
  const focused = useIsFocused();
  const { data, loading, refreshing, error, reload, refresh } = useLoad(() => api.me(), [], { refetchOnFocus: true });

  useEffect(() => { if (data?.profile) updateProfile(data.profile); }, [data, updateProfile]);

  const p = data?.profile || profile;
  const s = data?.stats || {};
  const goTab = (tab) => navigation.navigate('Orders', { tab, ts: Date.now() });
  const openOrder = (id) => navigation.navigate('OrderDetail', { id });

  const quick = [
    { icon: 'add-circle', label: 'Tạo đơn', onPress: () => navigation.navigate('CreateOrder') },
    { icon: 'scan', label: 'Tra cứu', onPress: () => navigation.navigate('Scan') },
    { icon: 'chatbubbles', label: 'Khiếu nại', onPress: () => navigation.navigate('Complaints'), badge: s.openComplaints },
    { icon: 'return-down-back', label: 'Hàng hoàn', onPress: () => navigation.navigate('Returns'), badge: s.returnsToConfirm },
    { icon: 'location', label: 'Địa chỉ', onPress: () => navigation.navigate('Addresses') },
  ];

  const maxDay = Math.max(1, ...(data?.days || []).map((d) => Math.max(d.created || 0, d.delivered || 0)));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={[colors.brand]} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <NavyHeader
          subtitle={`${greeting()}, ${p?.fullName || p?.username || ''}`}
          title={p?.shop?.name || 'CE Shop'}
          right={<HeaderIconButton icon="notifications-outline" badge={data?.unreadNotifications} onPress={() => navigation.navigate('Notifications')} />}
        >
          <View style={styles.shopRow}>
            {p?.shop?.code ? <View style={styles.shopChip}><Ionicons name="storefront-outline" size={13} color="#fff" /><Text style={styles.shopChipText}>{p.shop.code}</Text></View> : null}
            {p?.shop?.cycleText ? <View style={styles.shopChip}><Ionicons name="repeat-outline" size={13} color="#fff" /><Text style={styles.shopChipText}>Đối soát {String(p.shop.cycleText).toLowerCase()}</Text></View> : null}
          </View>
          <View style={styles.kpiStrip}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiLabel}>Đơn tháng này</Text>
              <Text style={styles.kpiValue}>{s.ordersMonth ?? '–'}</Text>
            </View>
            <View style={styles.kpiDiv} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kpiLabel}>Tỷ lệ thành công</Text>
              <Text style={styles.kpiValue}>{s.successRateMonth != null ? String(s.successRateMonth).replace('.', ',') + '%' : '–'}</Text>
            </View>
            <View style={styles.kpiDiv} />
            <View style={{ flex: 1.2 }}>
              <Text style={styles.kpiLabel}>COD chờ đối soát</Text>
              <Text style={styles.kpiValue} numberOfLines={1}>{data ? shortMoney(s.codAwaitingSettlement) : '–'}</Text>
            </View>
          </View>
        </NavyHeader>

        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {loading && !data ? <Loading style={{ paddingTop: 60 }} /> : null}
          <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 12 }} />

          {data && !data.hasPickupAddress ? (
            <Notice tone="warning" icon="warning" style={{ marginBottom: 12 }} onPress={() => navigation.navigate('Addresses')}
              text="Shop chưa có địa chỉ lấy hàng. Thêm địa chỉ để bưu cục đến lấy hàng nhanh hơn." />
          ) : null}
          {s.draftSettlements > 0 ? (
            <Notice tone="info" icon="document-text" style={{ marginBottom: 12 }} onPress={() => navigation.navigate('Finance', { seg: 'settle', ts: Date.now() })}
              text={`Có ${s.draftSettlements} phiên đối soát chờ shop xác nhận.`} />
          ) : null}

          {/* Thao tác nhanh */}
          <Card style={styles.quickCard}>
            {quick.map((q) => (
              <Pressable key={q.label} onPress={q.onPress} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.6 }]}>
                <View style={styles.quickIcon}>
                  <Ionicons name={q.icon} size={22} color={colors.brand600} />
                  {q.badge ? <View style={styles.qBadge}><Text style={styles.qBadgeText}>{q.badge}</Text></View> : null}
                </View>
                <Text style={styles.quickText} numberOfLines={1}>{q.label}</Text>
              </Pressable>
            ))}
          </Card>

          {/* Trạng thái đơn */}
          <SectionTitle title="Tình trạng đơn hàng" right={
            <Pressable onPress={() => goTab('')} hitSlop={8}><Text style={styles.link}>Tất cả đơn</Text></Pressable>
          } />
          <View style={styles.grid}>
            {STATS.map((it) => (
              <Pressable key={it.key} onPress={() => goTab(it.tab)} style={({ pressed }) => [styles.stat, pressed && { transform: [{ scale: 0.97 }] }]}>
                <View style={[styles.statIcon, { backgroundColor: it.bg }]}><Ionicons name={it.icon} size={18} color={it.fg} /></View>
                <Text style={[styles.statValue, it.key === 'needAction' && s.needAction > 0 && { color: colors.danger }]}>{s[it.key] ?? 0}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{it.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Tiền */}
          <SectionTitle title="Tiền hàng (COD)" right={
            <Pressable onPress={() => navigation.navigate('Finance', { seg: 'cod', ts: Date.now() })} hitSlop={8}><Text style={styles.link}>Chi tiết</Text></Pressable>
          } />
          <Card>
            <View style={styles.moneyRow}>
              <MoneyBox label="Shipper đang giữ" value={s.codHeldByShipper} icon="bicycle" color={colors.warning} />
              <MoneyBox label="Chờ đối soát" value={s.codAwaitingSettlement} icon="time" color={colors.info} />
            </View>
            <View style={[styles.moneyRow, { marginTop: 12 }]}>
              <MoneyBox label="Đã nhận tháng này" value={s.codPaidMonth} icon="checkmark-circle" color={colors.success} />
              <MoneyBox label="Chưa thu" value={s.codNotCollected} icon="hourglass" color={colors.muted} />
            </View>
            <View style={styles.debt}>
              <View style={{ flex: 1 }}>
                <Text style={styles.debtLabel}>Số dư công nợ</Text>
                <Text style={styles.debtHint}>Dương = công ty nợ shop · Âm = shop nợ công ty</Text>
              </View>
              <Text style={[styles.debtValue, { color: (s.debtBalance || 0) >= 0 ? colors.success : colors.danger }]}>{money(s.debtBalance)}</Text>
            </View>
          </Card>

          {/* KPI tháng */}
          <SectionTitle title="Tháng này" />
          <View style={styles.kpiGrid}>
            <Kpi label="Tổng đơn" value={String(s.ordersMonth ?? 0)} icon="cube" />
            <Kpi label="Giao thành công" value={String(s.deliveredMonth ?? 0)} icon="checkmark-done" />
            <Kpi label="Tỷ lệ thành công" value={(s.successRateMonth != null ? String(s.successRateMonth).replace('.', ',') : '0') + '%'} icon="trending-up" />
            <Kpi label="Tổng cước" value={shortMoney(s.feeMonth)} icon="pricetag" />
          </View>

          {/* Biểu đồ 7 ngày */}
          {data?.days?.length ? (
            <>
              <SectionTitle title="7 ngày gần đây" right={
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Legend color={colors.brand} text="Tạo" />
                  <Legend color={colors.success} text="Giao" />
                </View>
              } />
              <Card>
                <View style={styles.chart}>
                  {data.days.map((d) => (
                    <View key={d.day} style={styles.chartCol}>
                      <View style={styles.chartBars}>
                        <Bar value={d.created} max={maxDay} color={colors.brand} />
                        <Bar value={d.delivered} max={maxDay} color={colors.success} />
                      </View>
                      <Text style={styles.chartDay}>{d.day}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : null}

          {/* Đơn cần xử lý */}
          <SectionTitle title="Đơn cần xử lý" right={
            s.needAction > 0 ? <Pressable onPress={() => goTab('issue')} hitSlop={8}><Text style={styles.link}>Xem {s.needAction}</Text></Pressable> : null
          } />
          {data && !(data.needAction || []).length ? (
            <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={font.body}>Không có đơn giao thất bại cần xử lý</Text>
            </View></Card>
          ) : null}
          {(data?.needAction || []).map((o) => (
            <Card key={o.id} onPress={() => openOrder(o.id)} style={{ marginBottom: 10, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[font.h3, { flex: 1 }]}>{o.trackingCode}</Text>
                <StatusBadge status={o.status} text={o.statusText} />
              </View>
              <Text style={[font.small, { marginTop: 4 }]} numberOfLines={1}>{o.receiverName} · {o.receiverPhone} · {o.province}</Text>
              {o.lastFailReason ? <Text style={styles.failText} numberOfLines={2}>{o.lastFailReason}</Text> : null}
            </Card>
          ))}

          {/* Thông báo hệ thống */}
          {(data?.announcements || []).length ? <SectionTitle title="Thông báo từ Courier Express" /> : null}
          {(data?.announcements || []).map((a, i) => (
            <Card key={i} style={{ marginBottom: 10, flexDirection: 'row', gap: 12 }}>
              <Ionicons name="megaphone" size={20} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={font.h3}>{a.title}</Text>
                {a.content ? <Text style={[font.small, { marginTop: 4, lineHeight: 19 }]}>{a.content}</Text> : null}
              </View>
            </Card>
          ))}

          {!loading && !data && !error ? <Empty title="Chưa có dữ liệu" /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const MoneyBox = ({ label, value, icon, color }) => (
  <View style={styles.moneyBox}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={styles.moneyLabel} numberOfLines={1}>{label}</Text>
    </View>
    <Text style={styles.moneyValue} numberOfLines={1} adjustsFontSizeToFit>{money(value)}</Text>
  </View>
);

const Kpi = ({ label, value, icon }) => (
  <View style={styles.kpi}>
    <Ionicons name={icon} size={18} color={colors.brand} />
    <Text style={styles.kpiBig} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    <Text style={styles.kpiSmall}>{label}</Text>
  </View>
);

const Bar = ({ value, max, color }) => (
  <View style={{ alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
    {value ? <Text style={styles.barNum}>{value}</Text> : null}
    <View style={{ width: 9, borderRadius: 5, backgroundColor: color, height: Math.max(3, (value / max) * 92), opacity: value ? 1 : 0.25 }} />
  </View>
);

const Legend = ({ color, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
    <Text style={font.small}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  shopRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  shopChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  shopChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  kpiStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  kpiLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11.5 },
  kpiValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 3 },
  kpiDiv: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 10 },
  quickCard: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 14 },
  quick: { flex: 1, alignItems: 'center', gap: 7 },
  quickIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  qBadge: { position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  qBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  link: { color: colors.brand600, fontWeight: '700', fontSize: 13.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31.6%', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border, ...shadow },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 1, fontWeight: '600' },
  moneyRow: { flexDirection: 'row', gap: 12 },
  moneyBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },
  moneyLabel: { fontSize: 12, color: colors.muted, fontWeight: '600', flexShrink: 1 },
  moneyValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 5 },
  debt: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  debtLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  debtHint: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  debtValue: { fontSize: 17, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48.3%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow },
  kpiBig: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8 },
  kpiSmall: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', height: 140 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  chartDay: { fontSize: 11, color: colors.muted, marginTop: 6 },
  barNum: { fontSize: 9.5, color: colors.muted, marginBottom: 2 },
  failText: { fontSize: 12.5, color: colors.danger, marginTop: 6 },
});
