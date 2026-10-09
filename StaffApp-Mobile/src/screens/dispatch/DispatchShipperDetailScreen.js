import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useLoad } from '../../hooks';
import { colors, radius, taskTypeMeta } from '../../theme';
import { addDays, ago, dt, isoDay, money, weekday, within } from '../../format';
import { ActionChip, Card, Chips, ListState, Row, SectionTitle, call, openMap, sms } from '../../components/ui';

const TYPE_KEY = { Pickup: 'pickup', Delivery: 'delivery', Return: 'return' };

export default function DispatchShipperDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [day, setDay] = useState(0);
  const [type, setType] = useState(null);
  const fn = useCallback(async () => {
    const r = await staff.dispatchShipper(id, day ? isoDay(addDays(-day)) : undefined);
    navigation.setOptions({ title: r.data.name });
    return r.data;
  }, [id, day, navigation]);
  const { data: s, error, loading, refreshing, refresh, reload } = useLoad(fn);
  if (!s) return <ListState loading={loading} error={error} onRetry={reload} />;

  const online = within(s.lastLocationAt, 30);
  const tasks = (s.tasks || []).filter((t) => !type || t.type === type);
  const counts = (s.tasks || []).reduce((m, t) => ({ ...m, [t.type]: (m[t.type] || 0) + 1 }), {});
  const collect = (s.tasks || []).reduce((sum, t) => sum + (t.amountToCollect || 0), 0);
  const last = s.track?.last;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{s.name}</Text>
            <Text style={styles.sub}>{[s.code, s.vehiclePlate, s.warehouse].filter(Boolean).join(' · ')}</Text>
          </View>
          <View style={[styles.status, { backgroundColor: online ? colors.successBg : '#E2E8F0' }]}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : '#94A3B8' }]} />
            <Text style={{ color: online ? colors.success : '#475569', fontWeight: '700', fontSize: 12 }}>{online ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <View style={styles.chips}>
          <ActionChip icon="call" label="Gọi" color={colors.success} onPress={() => call(s.phone)} />
          <ActionChip icon="chatbubble-ellipses" label="Nhắn tin" onPress={() => sms(s.phone)} />
          {s.lat != null && s.lng != null ? <ActionChip icon="map" label="Xem bản đồ" color={colors.violet} onPress={() => openMap(s.lat, s.lng, s.name)} /> : null}
        </View>
      </Card>

      <SectionTitle title="Vị trí" />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <Row icon="locate-outline" label="Vị trí cuối" value={s.lastLocationAt ? `${ago(s.lastLocationAt)} (${dt(s.lastLocationAt)})` : 'Chưa có'} />
        <Row icon="navigate-outline" label="Tọa độ" value={s.lat != null ? `${Number(s.lat).toFixed(5)}, ${Number(s.lng).toFixed(5)}` : '—'}
          onPress={s.lat != null ? () => openMap(s.lat, s.lng, s.name) : undefined} />
        <Row icon="footsteps-outline" label={`Điểm GPS ${day === 0 ? 'hôm nay' : 'ngày ' + addDays(-day).getDate() + '/' + (addDays(-day).getMonth() + 1)}`} value={`${s.track?.points || 0} điểm${s.track?.first ? ` · ${dt(s.track.first.at)} → ${dt(last?.at)}` : ''}`}
          onPress={last ? () => openMap(last.lat, last.lng, s.name) : undefined} last />
      </Card>

      <SectionTitle title={`Việc đang giữ (${s.tasks?.length || 0})`} right={collect > 0 ? <Text style={styles.collect}>Cần thu {money(collect)}</Text> : null} />
      <Chips value={type} onChange={setType} style={{ marginBottom: 10 }} items={[
        { key: null, label: 'Tất cả', count: s.tasks?.length },
        { key: 'Pickup', label: 'Lấy hàng', count: counts.Pickup || 0 },
        { key: 'Delivery', label: 'Giao hàng', count: counts.Delivery || 0 },
        { key: 'Return', label: 'Trả hoàn', count: counts.Return || 0 },
      ]} />
      {tasks.length === 0 ? <Card><Text style={styles.none}>Không có việc đang giữ</Text></Card> : tasks.map((t) => {
        const m = taskTypeMeta[TYPE_KEY[t.type]] || taskTypeMeta.delivery;
        return (
          <Pressable key={t.type + t.orderId} onPress={() => navigation.navigate('StaffOrderDetail', { id: t.orderId })} style={styles.task}>
            <View style={[styles.tIcon, { backgroundColor: m.bg }]}><Ionicons name={m.icon} size={17} color={m.color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tCode}>{t.trackingCode}</Text>
              <Text style={styles.tSub} numberOfLines={1}>{[t.typeText, t.contact, t.district, t.statusText].filter(Boolean).join(' · ')}</Text>
            </View>
            {t.amountToCollect > 0 ? <Text style={styles.tAmt}>{money(t.amountToCollect)}</Text> : null}
          </Pressable>
        );
      })}

      <SectionTitle title="Kết quả theo ngày" />
      <Chips value={day} onChange={setDay} style={{ marginBottom: 10 }}
        items={Array.from({ length: 7 }).map((_, i) => ({ key: i, label: i === 0 ? 'Hôm nay' : `${weekday(addDays(-i))} ${addDays(-i).getDate()}/${addDays(-i).getMonth() + 1}` }))} />
      {(s.done || []).length === 0 ? <Card><Text style={styles.none}>Chưa có việc hoàn tất trong ngày</Text></Card> : (
        <Card padded={false}>
          {s.done.map((d, i) => (
            <Pressable key={i} onPress={() => navigation.navigate('StaffOrderDetail', { id: d.orderId })} style={[styles.done, i < s.done.length - 1 && styles.border]}>
              <Ionicons name={d.result === 'Completed' ? 'checkmark-circle' : 'close-circle'} size={18} color={d.result === 'Completed' ? colors.success : colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tCode}>{d.trackingCode}</Text>
                <Text style={styles.tSub}>{d.typeText} · {d.resultText}</Text>
              </View>
              <Text style={styles.time}>{dt(d.time)}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 19, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  collect: { fontSize: 13, fontWeight: '700', color: colors.brand600 },
  none: { color: colors.muted, textAlign: 'center' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  tIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tCode: { fontSize: 14, fontWeight: '700', color: colors.text },
  tSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  tAmt: { fontSize: 13, fontWeight: '700', color: colors.text },
  done: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  time: { fontSize: 12, color: colors.faint },
});
