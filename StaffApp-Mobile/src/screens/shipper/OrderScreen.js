import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { shipper } from '../../api';
import { colors, statusColor, taskTypeMeta } from '../../theme';
import { date, dt, money } from '../../format';
import { ActionChip, Badge, Button, Card, Loading, Row, SectionTitle, StatusBadge, call, navigateTo, sms } from '../../components/ui';

export default function OrderScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [o, setO] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await shipper.order(id); setO(res.data); setError(''); navigation.setOptions({ title: res.data.trackingCode }); }
    catch (e) { setError(e.message); }
  }, [id, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (key, fn, confirm) => {
    const exec = async () => {
      setBusy(key);
      try {
        const r = await fn();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (r?.message) Alert.alert('Thành công', r.message);
        await load();
      } catch (e) { Alert.alert('Không thực hiện được', e.message); }
      finally { setBusy(''); }
    };
    if (confirm) Alert.alert(confirm.title, confirm.text, [{ text: 'Hủy', style: 'cancel' }, { text: confirm.ok, onPress: exec }]);
    else exec();
  };

  if (!o) return error ? <View style={{ padding: 24 }}><Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text></View> : <Loading />;

  const isPickup = o.type === 'pickup' || o.type === 'return';
  const contact = isPickup ? o.sender : o.receiver;
  const meta = taskTypeMeta[o.type] || null;
  const sc = statusColor(o.status);
  const a = o.actions || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.code}>{o.trackingCode}</Text>
              <Text style={styles.sub}>{[o.service, o.shop].filter(Boolean).join(' · ')}{o.referenceCode ? ` · ${o.referenceCode}` : ''}</Text>
            </View>
            <StatusBadge status={o.status} text={o.statusText} />
          </View>
          {meta ? (
            <View style={[styles.typeBar, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
              <Text style={{ color: meta.color, fontWeight: '700' }}>Nhiệm vụ: {meta.label}</Text>
            </View>
          ) : null}
          {o.failedAttempts > 0 ? (
            <View style={styles.warn}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={styles.warnText}>Đã giao thất bại {o.failedAttempts} lần{o.lastFailReason ? `: ${o.lastFailReason}` : ''}{o.nextDeliveryDate ? ` · hẹn ${date(o.nextDeliveryDate)}` : ''}</Text>
            </View>
          ) : null}
        </Card>

        <SectionTitle title={isPickup ? 'Người gửi (lấy hàng)' : 'Người nhận'} />
        <Card>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          <Text style={styles.contactAddr}>{contact.address}</Text>
          <View style={styles.chips}>
            <ActionChip icon="call" label="Gọi" color={colors.success} onPress={() => call(contact.phone)} />
            <ActionChip icon="chatbubble-ellipses" label="Nhắn tin" onPress={() => sms(contact.phone)} />
            <ActionChip icon="navigate" label="Chỉ đường" onPress={() => navigateTo(o.navigateTo)} />
          </View>
        </Card>

        {!isPickup ? null : (
          <>
            <SectionTitle title="Người nhận" />
            <Card><Text style={styles.contactName}>{o.receiver.name}</Text><Text style={styles.contactAddr}>{o.receiver.address}</Text></Card>
          </>
        )}

        <SectionTitle title="Hàng hóa & tiền" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row icon="cube-outline" label="Hàng hóa" value={`${o.item.name} × ${o.item.quantity}`} />
          <Row icon="barbell-outline" label="Khối lượng" value={`${o.item.weight} kg`} />
          {o.item.isFragile ? <Row icon="warning-outline" label="Lưu ý" value="Hàng dễ vỡ" valueStyle={{ color: colors.danger }} /> : null}
          <Row icon="cash-outline" label="Tiền thu hộ (COD)" value={money(o.codAmount)} />
          <Row icon="receipt-outline" label="Cước phí" value={`${money(o.totalFee)} · ${o.paymentMethod === 'RECEIVER' ? 'người nhận trả' : 'shop trả'}`} />
          <Row icon="wallet-outline" label="Tổng thu người nhận" value={money(o.amountToCollect)} valueStyle={{ color: colors.brand600, fontSize: 16 }} last={!o.note} />
          {o.note ? <Row icon="document-text-outline" label="Ghi chú" value={o.note} last /> : null}
        </Card>

        <SectionTitle title="Hành trình" />
        <Card>
          {(o.history || []).map((h, i) => (
            <View key={i} style={styles.tl}>
              <View style={styles.tlCol}>
                <View style={[styles.tlDot, i === 0 && { backgroundColor: sc.fg, borderColor: sc.bg }]} />
                {i < o.history.length - 1 ? <View style={styles.tlLine} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={[styles.tlTitle, i === 0 && { color: colors.text }]}>{h.statusText}</Text>
                  <Text style={styles.tlTime}>{dt(h.time)}</Text>
                </View>
                {h.note ? <Text style={styles.tlNote}>{h.note}</Text> : null}
                {h.location ? <Text style={styles.tlLoc}>{h.location}</Text> : null}
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      {a.length > 0 ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          {a.includes('pickup') ? (
            <View style={styles.actionRow}>
              <Button title="Lấy thất bại" variant="danger" style={{ flex: 1 }} onPress={() => navigation.navigate('Fail', { id, mode: 'pickup', code: o.trackingCode })} />
              <Button title="Đã lấy hàng" icon="checkmark-circle" variant="success" style={{ flex: 1.4 }} loading={busy === 'pickup'}
                onPress={() => run('pickup', () => shipper.pickup(id), { title: 'Xác nhận lấy hàng', text: `Đã nhận đủ hàng của đơn ${o.trackingCode}?`, ok: 'Xác nhận' })} />
            </View>
          ) : null}
          {a.includes('startDelivery') ? (
            <Button title="Bắt đầu giao" icon="bicycle" loading={busy === 'start'} onPress={() => run('start', () => shipper.startDelivery(id))} />
          ) : null}
          {a.includes('deliver') ? (
            <View style={styles.actionRow}>
              <Button title="Giao thất bại" variant="danger" style={{ flex: 1 }} onPress={() => navigation.navigate('Fail', { id, mode: 'delivery', code: o.trackingCode })} />
              <Button title="Giao thành công" icon="checkmark-circle" variant="success" style={{ flex: 1.4 }}
                onPress={() => navigation.navigate('Deliver', { id, order: o })} />
            </View>
          ) : null}
          {a.includes('returnDone') ? (
            <Button title="Đã trả hàng cho shop" icon="return-down-back" loading={busy === 'return'}
              onPress={() => run('return', () => shipper.returnDone(id), { title: 'Trả hàng hoàn', text: 'Xác nhận đã trả hàng hoàn cho shop?', ok: 'Xác nhận' })} />
          ) : null}
        </View>
      ) : (
        o.status === 'Delivered' ? (
          <View style={[styles.doneBar, { paddingBottom: insets.bottom + 12 }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={{ color: colors.success, fontWeight: '700' }}>Đã giao thành công · thu {money(o.codCollected)}</Text>
          </View>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  typeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10, backgroundColor: colors.warningBg, padding: 10, borderRadius: 10 },
  warnText: { flex: 1, color: '#92400E', fontSize: 13 },
  contactName: { fontSize: 17, fontWeight: '700', color: colors.text },
  contactPhone: { fontSize: 15, color: colors.brand600, fontWeight: '600', marginTop: 3 },
  contactAddr: { fontSize: 14, color: colors.text2, marginTop: 6, lineHeight: 20 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  tl: { flexDirection: 'row', gap: 12 },
  tlCol: { alignItems: 'center', width: 14 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#CBD5E1', borderWidth: 3, borderColor: '#F1F5F9', marginTop: 3 },
  tlLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginTop: 2 },
  tlTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text2, flex: 1 },
  tlTime: { fontSize: 12, color: colors.faint },
  tlNote: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  tlLoc: { fontSize: 12, color: colors.faint, marginTop: 2 },
  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  actionRow: { flexDirection: 'row', gap: 10 },
  doneBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.successBg, paddingTop: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
});
