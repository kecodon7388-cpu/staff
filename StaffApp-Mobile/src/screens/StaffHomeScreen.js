import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shipper, staff } from '../api';
import { useAuth } from '../auth';
import { layout, openGroup } from '../modules';
import { colors, radius, shadow } from '../theme';
import { greeting, initials, money, moneyShort } from '../format';
import { hapticErr } from '../hooks';
import { ErrorBox, HeaderIconButton, SectionTitle, Stat, Tile } from '../components/ui';
import { ScanModal, cleanCode } from '../components/Scanner';
import ShipperHome from '../components/ShipperHome';

export default function StaffHomeScreen({ navigation }) {
  const { profile, me, refreshMe, has, can, canReadOrders, modules } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [finding, setFinding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try { await refreshMe(); setError(''); } catch (e) { setError(e.message); }
  }, [refreshMe]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); setRefreshKey((k) => k + 1); await load(); setRefreshing(false); };

  const findCode = async (raw) => {
    const code = cleanCode(raw);
    if (!code) return;
    setFinding(true);
    try {
      if (canReadOrders) {
        const r = await staff.orderByCode(code);
        navigation.navigate('StaffOrderDetail', { id: r.data.id });
      } else {
        const r = await shipper.orderByCode(code);
        navigation.navigate('Order', { id: r.data.orderId });
      }
      setQ('');
    } catch (e) {
      hapticErr();
      Alert.alert('Không tìm thấy', e.message);
    } finally { setFinding(false); }
  };

  const search = () => {
    const k = q.trim();
    if (!k) return;
    // Có quyền tra cứu: mở danh sách tìm kiếm (mã / SĐT / tên); shipper: tìm thẳng theo mã
    if (canReadOrders) { navigation.navigate('OrderLookup', { q: k }); setQ(''); return; }
    findCode(k);
  };

  const st = me?.stats || {};
  const { tiles } = layout(modules);
  const go = (screen, params) => () => navigation.navigate(screen, params);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />} contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.glow} />
          <View style={styles.headRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.fullName)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>{greeting()},</Text>
              <Text style={styles.name} numberOfLines={1}>{profile?.fullName || 'Nhân viên'}</Text>
              <Text style={styles.role} numberOfLines={1}>{[profile?.roleText, profile?.branch].filter(Boolean).join(' · ') || 'CE Staff'}</Text>
            </View>
            <HeaderIconButton icon="notifications-outline" badge={me?.unreadNotifications} onPress={() => navigation.navigate('Notifications')} />
          </View>

          <View style={styles.search}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
            <TextInput value={q} onChangeText={setQ} placeholder={canReadOrders ? 'Mã vận đơn, SĐT, tên người nhận' : 'Nhập mã vận đơn'}
              placeholderTextColor="rgba(255,255,255,0.5)" style={styles.searchInput} autoCapitalize="characters" autoCorrect={false}
              returnKeyType="search" onSubmitEditing={search} />
            {finding ? <ActivityIndicator color="#fff" style={{ marginRight: 10 }} /> : null}
            <Pressable onPress={() => setScan(true)} style={styles.scanBtn} hitSlop={6}><Ionicons name="barcode-outline" size={21} color="#fff" /></Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {error ? <ErrorBox text={error} onRetry={load} style={{ marginTop: 14 }} /> : null}

          {st.warehouse ? (
            <ModuleCard title="Kho" icon="cube" color={colors.info} bg={colors.infoBg} onOpen={() => openGroup(navigation, modules, 'warehouse')}
              note={st.warehouse.overdue > 0 ? `${st.warehouse.overdue} đơn lưu kho quá ${st.warehouse.alertDays} ngày` : null}>
              <Stat label="Đang tồn kho" value={st.warehouse.inStock} onPress={go('WhInventory')} />
              <Stat label={`Quá ${st.warehouse.alertDays} ngày`} value={st.warehouse.overdue} alert={st.warehouse.overdue > 0} onPress={go('WhInventory', { overdue: true })} />
              <Stat label="Bảng kê đang gom" value={st.warehouse.openManifests} onPress={go('WhManifests', { status: 'Open' })} />
              <Stat label="Đang đến" value={st.warehouse.incoming} onPress={go('WhManifests', { status: 'Dispatched' })} />
            </ModuleCard>
          ) : null}

          {st.dispatch ? (
            <ModuleCard title="Điều phối" icon="git-network" color={colors.violet} bg={colors.violetBg} onOpen={() => openGroup(navigation, modules, 'dispatch')}>
              <Stat label="Chờ lấy hàng" value={st.dispatch.pickup} onPress={go('DispatchQueue', { tab: 'pickup' })} />
              <Stat label="Chờ giao hàng" value={st.dispatch.delivery} onPress={go('DispatchQueue', { tab: 'delivery' })} />
              <Stat label="Shipper online" value={st.dispatch.activeShippers} onPress={go('DispatchShippers')} />
              <Stat label="Đang giao" value={st.dispatch.delivering} onPress={go('DispatchShippers')} />
            </ModuleCard>
          ) : null}

          {st.finance ? (
            <ModuleCard title="Tài chính" icon="wallet" color={colors.success} bg={colors.successBg} onOpen={() => openGroup(navigation, modules, 'finance')}>
              <Stat label="COD shipper giữ" value={moneyShort(st.finance.codHeld)} alert={st.finance.codHeld > (st.finance.codAlertAmount || Infinity)}
                onPress={can('cod.manage') ? go('FinHolders') : () => openGroup(navigation, modules, 'finance')} />
              <Stat label="Phiếu nộp nháp" value={st.finance.draftRemittances} onPress={can('cod.manage') ? go('FinRemittances', { status: 'Draft' }) : undefined} />
              <Stat label="Đối soát nháp" value={st.finance.draftSettlements} onPress={go('FinSettlements', { status: 'Draft' })} />
              <Stat label="Chờ thanh toán" value={st.finance.confirmedSettlements} onPress={go('FinSettlements', { status: 'Confirmed' })} />
            </ModuleCard>
          ) : null}

          {st.complaints ? (
            <ModuleCard title="Khiếu nại" icon="chatbubbles" color={colors.warning} bg={colors.warningBg} onOpen={() => openGroup(navigation, modules, 'cases')}>
              <Stat label="Đang mở" value={st.complaints.open} onPress={go('Complaints', { scope: 'open' })} />
              <Stat label="Mới" value={st.complaints.isNew} alert={st.complaints.isNew > 0} onPress={go('Complaints', { status: 'New' })} />
              <Stat label="Của tôi" value={st.complaints.mine} onPress={go('Complaints', { scope: 'mine' })} />
              <Stat label="Chờ duyệt" value={st.complaints.waitingApproval} onPress={go('Complaints', { status: 'WaitingApproval' })} />
            </ModuleCard>
          ) : null}

          {st.returns ? (
            <ModuleCard title="Hàng hoàn" icon="return-down-back" color={colors.warning} bg={colors.warningBg} onOpen={go('Returns')}>
              <Stat label="Chờ hoàn" value={st.returns.pending} onPress={go('Returns', { status: 'Pending' })} />
              <Stat label="Đang hoàn" value={st.returns.returning} onPress={go('Returns', { status: 'Returning' })} />
              <Stat label="Tại kho hoàn" value={st.returns.atWarehouse} onPress={go('Returns', { status: 'AtReturnWarehouse' })} />
            </ModuleCard>
          ) : null}

          {st.dashboard ? (
            <ModuleCard title="Hôm nay" icon="stats-chart" color={colors.navy} bg="#E2E8F0" onOpen={go('Dashboard')}>
              <Stat label="Đơn mới" value={st.dashboard.newToday} onPress={go('Dashboard')} />
              <Stat label="Giao thành công" value={st.dashboard.deliveredToday} onPress={go('Dashboard')} />
              <Stat label="Đang giao" value={st.dashboard.delivering} onPress={canReadOrders ? go('OrderLookup', { status: 'Delivering' }) : go('Dashboard')} />
              <Stat label="Giao lỗi / hẹn lại" value={st.dashboard.failed} alert={st.dashboard.failed > 0} onPress={canReadOrders ? go('OrderLookup', { status: 'DeliveryFailed' }) : go('Dashboard')} />
            </ModuleCard>
          ) : null}

          {has('shipper') ? <ShipperHome navigation={navigation} refreshKey={refreshKey} /> : null}

          {tiles.length ? (
            <>
              <SectionTitle title="Chức năng khác" />
              <View style={styles.tiles}>
                {tiles.map((g) => (
                  <Tile key={g.key} icon={g.icon} label={g.title} sub={g.sub} color={g.color} bg={g.bg} onPress={() => openGroup(navigation, modules, g.key)} />
                ))}
              </View>
            </>
          ) : null}

          {!me && !error ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.brand} /> : null}
          {me?.stats && Object.keys(st).length === 0 && !has('shipper') ? (
            <Text style={styles.empty}>Chưa có số liệu tóm tắt cho chức vụ của bạn. Dùng các tab bên dưới để làm việc.</Text>
          ) : null}
          {st.finance && st.finance.codHeld > 0 ? <Text style={styles.foot}>Tổng COD shipper đang giữ: {money(st.finance.codHeld)}</Text> : null}
        </View>
      </ScrollView>
      <ScanModal visible={scan} onClose={() => setScan(false)} onCode={findCode} title="Quét mã tra cứu" />
    </View>
  );
}

function ModuleCard({ title, icon, color, bg, onOpen, children, note }) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} style={styles.cardHead} hitSlop={4}>
        <View style={[styles.cardIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={17} color={color} /></View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.open}>Mở</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.brand} />
      </Pressable>
      <View style={styles.grid}>{children}</View>
      {note ? (
        <View style={styles.warn}><Ionicons name="alert-circle" size={15} color={colors.danger} /><Text style={styles.warnText}>{note}</Text></View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingBottom: 20, overflow: 'hidden' },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: colors.brand, opacity: 0.32, top: -140, right: -90 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hello: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  name: { color: '#fff', fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  role: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingLeft: 12, height: 48,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  scanBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 14, ...shadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  cardIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, fontSize: 15.5, fontWeight: '700', color: colors.text },
  open: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.dangerBg, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  warnText: { color: '#991B1B', fontSize: 12.5, fontWeight: '600', flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24, paddingHorizontal: 20 },
  foot: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 18 },
});
