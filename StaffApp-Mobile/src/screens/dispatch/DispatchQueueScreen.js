/**
 * Hàng chờ điều phối: GET dispatch/queue?tab=pickup|delivery&provinceId&districtId&unassignedOnly
 * Chọn nhiều đơn → phân công 1 shipper (POST dispatch/assign {ids, shipperId, type}).
 * "Tự động phân công" → POST dispatch/auto?tab=... (theo tuyến & khu vực phụ trách).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { confirmAsk, hapticErr, hapticOk, useLoad, usePaged } from '../../hooks';
import { colors, radius } from '../../theme';
import { ago, date, money } from '../../format';
import { BottomBar, Button, Check, ListFooter, ListState, Segmented, Sheet, ToggleRow } from '../../components/ui';
import { AreaFields } from '../../components/PickField';
import PickerModal from '../../components/PickerModal';
import { useLookups } from '../../lookups';

export default function DispatchQueueScreen({ navigation, route }) {
  const [tab, setTab] = useState(route.params?.tab === 'pickup' ? 'pickup' : 'delivery');
  const [filter, setFilter] = useState({ provinceId: null, districtId: null, unassignedOnly: true });
  const [filterOpen, setFilterOpen] = useState(false);
  const [sel, setSel] = useState(new Set());
  const [pickOpen, setPickOpen] = useState(false);
  const [shippers, setShippers] = useState(null);
  const [shipErr, setShipErr] = useState('');
  const [busy, setBusy] = useState('');
  const { lookups } = useLookups();

  useEffect(() => { if (route.params?.tab) setTab(route.params.tab === 'pickup' ? 'pickup' : 'delivery'); }, [route.params?.tab]);

  const fn = useCallback(() => staff.dispatchQueue({ tab, ...filter }), [tab, filter]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const items = data?.tab === tab ? data.items : null;
  const { list, more, loadMore, total } = usePaged(items, 40);
  useEffect(() => { setSel(new Set()); }, [tab, filter]);

  const auto = useCallback(async () => {
    const label = tab === 'pickup' ? 'lấy hàng' : 'giao hàng';
    if (!(await confirmAsk('Tự động phân công', `Phân công tất cả đơn chờ ${label} chưa có shipper theo tuyến & khu vực phụ trách?`, 'Phân công'))) return;
    setBusy('auto');
    try {
      const r = await staff.dispatchAuto(tab);
      hapticOk();
      const ok = r.data?.ok ?? 0; const all = r.data?.total ?? 0;
      Alert.alert('Kết quả tự động phân công', `${r.message}\n\nThành công: ${ok} đơn\nChưa phân được: ${all - ok} đơn (không có tuyến / shipper phụ trách khu vực)`);
      reload();
    } catch (e) { hapticErr(); Alert.alert('Không phân công được', e.message); }
    finally { setBusy(''); }
  }, [tab, reload]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={auto} hitSlop={8} style={styles.auto} disabled={busy === 'auto'}>
          <Ionicons name="flash" size={16} color="#fff" /><Text style={styles.autoText}>{busy === 'auto' ? 'Đang chạy…' : 'Tự động'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, auto, busy]);

  const openPicker = async () => {
    setPickOpen(true); setShipErr('');
    try { setShippers((await staff.dispatchShippers()).items || []); } catch (e) { setShipErr(e.message); setShippers([]); }
  };

  const assign = async (s) => {
    if (!s) return;
    const ids = [...sel];
    const label = tab === 'pickup' ? 'lấy' : 'giao';
    if (!(await confirmAsk('Phân công', `Giao ${ids.length} đơn cho ${s.name} đi ${label}?`, 'Phân công'))) return;
    setBusy('assign');
    try {
      const r = await staff.dispatchAssign({ ids, shipperId: s.id, type: tab });
      hapticOk();
      Alert.alert('Đã phân công', r.message);
      setSel(new Set());
      reload();
    } catch (e) { hapticErr(); Alert.alert('Không phân công được', e.message); }
    finally { setBusy(''); }
  };

  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = items && items.length > 0 && items.every((i) => sel.has(i.id));
  const selCod = useMemo(() => (items || []).filter((i) => sel.has(i.id)).reduce((s, i) => s + (i.codAmount || 0), 0), [items, sel]);

  const provinceName = lookups?.provinces?.find((p) => p.id === filter.provinceId)?.name;
  const filterText = [provinceName || 'Tất cả tỉnh', filter.districtId ? 'đã chọn quận' : null, filter.unassignedOnly ? 'chưa phân công' : 'gồm đã phân công'].filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <Segmented value={tab} onChange={setTab} items={[
          { key: 'pickup', label: 'Lấy hàng', count: data?.counts?.pickup },
          { key: 'delivery', label: 'Giao hàng', count: data?.counts?.delivery },
        ]} />
        <View style={styles.filterRow}>
          <Pressable onPress={() => setFilterOpen(true)} style={styles.filterBtn}>
            <Ionicons name="options-outline" size={16} color={colors.text2} />
            <Text style={styles.filterText} numberOfLines={1}>{filterText}</Text>
          </Pressable>
          <Pressable onPress={() => setSel(allOn ? new Set() : new Set((items || []).map((i) => i.id)))} style={styles.allBtn} hitSlop={6}>
            <Check on={allOn} size={20} /><Text style={styles.allText}>Tất cả</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore}
        renderItem={({ item: o }) => {
          const on = sel.has(o.id);
          return (
            <Pressable onPress={() => toggle(o.id)} onLongPress={() => navigation.navigate('StaffOrderDetail', { id: o.id })}
              style={[styles.item, on && { borderColor: colors.brand, backgroundColor: '#F8FBFF' }]}>
              <Check on={on} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.code}>{o.trackingCode}</Text>
                  {o.district ? <Text style={styles.district}>{o.district}</Text> : null}
                </View>
                <Text style={styles.name} numberOfLines={1}>{o.contactName} · {o.contactPhone}</Text>
                <Text style={styles.addr} numberOfLines={2}>{o.address}</Text>
                <Text style={styles.meta} numberOfLines={1}>{[o.statusText, o.shop, o.weight != null ? o.weight + ' kg' : null, o.warehouse].filter(Boolean).join(' · ')}</Text>
                {o.shipper ? <Text style={[styles.meta, { color: colors.brand600 }]}>Đang giao cho: {o.shipper}</Text> : null}
                {o.failedAttempts > 0 ? <Text style={[styles.meta, { color: colors.warning }]}>Giao lỗi {o.failedAttempts} lần{o.lastFailReason ? ': ' + o.lastFailReason : ''}{o.nextDeliveryDate ? ' · hẹn ' + date(o.nextDeliveryDate) : ''}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {o.codAmount > 0 ? <Text style={styles.cod}>{money(o.codAmount)}</Text> : null}
                <Pressable onPress={() => navigation.navigate('StaffOrderDetail', { id: o.id })} hitSlop={8}><Ionicons name="information-circle-outline" size={20} color={colors.faint} /></Pressable>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<ListState loading={(loading && !items) || (!items && !error)} error={error} onRetry={reload} icon="checkmark-done-circle-outline"
          title="Không còn đơn chờ điều phối" text="Thử bỏ lọc khu vực hoặc xem cả đơn đã phân công" />}
        ListFooterComponent={<ListFooter more={more} onMore={loadMore} shown={list?.length || 0} total={total} note="tối đa 300 đơn mỗi lần" />}
      />
      {sel.size > 0 ? (
        <BottomBar>
          <Text style={styles.selText}>Đã chọn {sel.size} đơn{selCod > 0 ? ` · COD ${money(selCod)}` : ''}</Text>
          <Button title={`Phân công ${sel.size} đơn cho shipper`} icon="person-add" loading={busy === 'assign'} onPress={openPicker} />
        </BottomBar>
      ) : null}

      <Sheet visible={filterOpen} title="Lọc hàng chờ" onClose={() => setFilterOpen(false)}
        footer={<Button title="Áp dụng" icon="checkmark" onPress={() => setFilterOpen(false)} style={{ marginTop: 8 }} />}>
        <AreaFields provinceId={filter.provinceId} districtId={filter.districtId} onChange={(a) => setFilter((f) => ({ ...f, ...a }))} />
        <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border }}>
          <ToggleRow label="Chỉ đơn chưa phân công" sub={tab === 'delivery' ? 'Đơn giao lỗi / hẹn lại luôn được hiện' : null}
            value={filter.unassignedOnly} onChange={(v) => setFilter((f) => ({ ...f, unassignedOnly: v }))} last />
        </View>
      </Sheet>

      <PickerModal visible={pickOpen} title={`Chọn shipper (${sel.size} đơn)`} items={shippers} loading={shippers == null} error={shipErr}
        onClose={() => setPickOpen(false)} onSelect={(s) => setTimeout(() => assign(s), 450)}
        getLabel={(s) => `${s.name} (${s.code})`}
        getSub={(s) => [s.areas || s.warehouse, `Lấy ${s.pickup} · Giao ${s.delivery} · Hoàn ${s.returns}`, s.online ? 'Online' : 'Vị trí ' + ago(s.lastLocationAt)].filter(Boolean).join('\n')}
        getSearch={(s) => [s.name, s.code, s.phone, s.areas, s.warehouse].join(' ')}
        renderRight={(s) => <View style={[styles.dot, { backgroundColor: s.online ? colors.success : '#CBD5E1' }]} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', borderRadius: 11, paddingHorizontal: 12, height: 38 },
  filterText: { flex: 1, fontSize: 13, color: colors.text2, fontWeight: '600' },
  allBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  allText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.violet, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 10 },
  autoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  item: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8 },
  code: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  district: { fontSize: 11.5, fontWeight: '700', color: colors.violet, backgroundColor: colors.violetBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  name: { fontSize: 13.5, fontWeight: '600', color: colors.text2, marginTop: 3 },
  addr: { fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 17 },
  meta: { fontSize: 11.5, color: colors.faint, marginTop: 3 },
  cod: { fontSize: 13, fontWeight: '700', color: colors.text },
  selText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
