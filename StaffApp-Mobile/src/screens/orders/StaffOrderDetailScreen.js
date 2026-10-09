import React, { useCallback } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { colors, statusColor } from '../../theme';
import { date, dt, dtFull, money } from '../../format';
import { ActionChip, Button, CaseBadge, Card, ListState, Row, SectionTitle, StatusBadge, call, navigateTo, sms } from '../../components/ui';

export default function StaffOrderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { has, canAny } = useAuth();
  const fn = useCallback(async () => {
    const r = await staff.order(id);
    navigation.setOptions({ title: r.data.trackingCode });
    return r.data;
  }, [id, navigation]);
  const { data: o, error, loading, refreshing, refresh, reload } = useLoad(fn);
  if (!o) return <ListState loading={loading} error={error} onRetry={reload} />;
  const sc = statusColor(o.status);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{o.trackingCode}</Text>
            <Text style={styles.sub}>{[o.service, o.shop, o.referenceCode ? 'Mã shop ' + o.referenceCode : null].filter(Boolean).join(' · ')}</Text>
          </View>
          <StatusBadge status={o.status} text={o.statusText} />
        </View>
        <Text style={styles.created}>Tạo lúc {dtFull(o.createdAt)}</Text>
        {o.warehouse ? (
          <View style={styles.wh}>
            <Ionicons name="business-outline" size={15} color={colors.info} />
            <Text style={styles.whText}>Đang ở {o.warehouse}{o.location ? ' · ô ' + o.location : ''}{o.inWarehouseSince ? ' · từ ' + date(o.inWarehouseSince) : ''}</Text>
          </View>
        ) : null}
        {o.failedAttempts > 0 ? (
          <View style={styles.warn}>
            <Ionicons name="alert-circle" size={15} color={colors.warning} />
            <Text style={styles.warnText}>Giao thất bại {o.failedAttempts} lần{o.lastFailReason ? ': ' + o.lastFailReason : ''}{o.nextDeliveryDate ? ' · hẹn ' + date(o.nextDeliveryDate) : ''}</Text>
          </View>
        ) : null}
        {o.cancelReason ? <Text style={styles.cancel}>Lý do hủy: {o.cancelReason}</Text> : null}
      </Card>

      <SectionTitle title="Người gửi" />
      <Contact c={o.sender} extra={o.shopPhone && o.shopPhone !== o.sender?.phone ? { label: 'Gọi shop', phone: o.shopPhone } : null} />
      <SectionTitle title="Người nhận" />
      <Contact c={o.receiver} />

      <SectionTitle title="Hàng hóa & tiền" />
      <Card padded={false} style={{ paddingHorizontal: 16 }}>
        <Row icon="cube-outline" label="Hàng hóa" value={`${o.item?.name || '—'} × ${o.item?.quantity ?? 1}`} />
        <Row icon="barbell-outline" label="Khối lượng tính cước" value={`${o.item?.weight ?? 0} kg`} />
        <Row icon="shield-outline" label="Giá trị khai" value={money(o.item?.declaredValue)} />
        {o.item?.isFragile ? <Row icon="warning-outline" label="Lưu ý" value="Hàng dễ vỡ" valueStyle={{ color: colors.danger }} /> : null}
        <Row icon="cash-outline" label="Tiền thu hộ (COD)" value={money(o.codAmount)} />
        <Row icon="wallet-outline" label="Trạng thái COD" value={`${o.codStatusText}${o.codCollected ? ' · đã thu ' + money(o.codCollected) : ''}`} />
        <Row icon="receipt-outline" label="Cước phí" value={`${money(o.totalFee)} · ${o.paymentMethod === 'RECEIVER' ? 'người nhận trả' : 'shop trả'}`} />
        <Row icon="card-outline" label="Tổng thu người nhận" value={money(o.amountToCollect)} valueStyle={{ color: colors.brand600, fontSize: 16 }} last={!o.note} />
        {o.note ? <Row icon="document-text-outline" label="Ghi chú" value={o.note} last /> : null}
      </Card>

      {o.pickupShipper || o.deliveryShipper ? (
        <>
          <SectionTitle title="Shipper" />
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {o.pickupShipper ? <ShipperRow label="Lấy hàng" s={o.pickupShipper} last={!o.deliveryShipper} onOpen={has('dispatch') ? () => navigation.navigate('DispatchShipperDetail', { id: o.pickupShipper.id }) : null} /> : null}
            {o.deliveryShipper ? <ShipperRow label="Giao hàng" s={o.deliveryShipper} last onOpen={has('dispatch') ? () => navigation.navigate('DispatchShipperDetail', { id: o.deliveryShipper.id }) : null} /> : null}
          </Card>
        </>
      ) : null}

      {o.deliveredAt || o.proofPhoto || o.signature ? (
        <>
          <SectionTitle title="Bằng chứng giao hàng" />
          <Card>
            <Text style={styles.proofText}>Giao lúc {dtFull(o.deliveredAt)}{o.recipient ? ' · người nhận: ' + o.recipient : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {o.proofPhoto ? <Pressable onPress={() => Linking.openURL(o.proofPhoto)}><Image source={{ uri: o.proofPhoto }} style={styles.proof} /></Pressable> : null}
              {o.signature ? <Pressable onPress={() => Linking.openURL(o.signature)}><Image source={{ uri: o.signature }} style={[styles.proof, { resizeMode: 'contain', backgroundColor: '#fff' }]} /></Pressable> : null}
            </View>
          </Card>
        </>
      ) : null}

      {(o.complaints || []).length || (o.returns || []).length ? <SectionTitle title="Khiếu nại & hàng hoàn" /> : null}
      {(o.complaints || []).map((c) => (
        <Card key={'c' + c.id} style={{ marginBottom: 8 }} onPress={has('complaints') ? () => navigation.navigate('ComplaintDetail', { id: c.id }) : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="chatbubbles-outline" size={17} color={colors.warning} />
            <Text style={styles.link} numberOfLines={1}>{c.code} · {c.title}</Text>
            <CaseBadge status={c.status} text={c.statusText} />
          </View>
        </Card>
      ))}
      {(o.returns || []).map((r) => (
        <Card key={'r' + r.id} style={{ marginBottom: 8 }} onPress={has('returns') ? () => navigation.navigate('ReturnDetail', { id: r.id }) : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="return-down-back-outline" size={17} color={colors.info} />
            <Text style={styles.link} numberOfLines={1}>{r.code} · {r.reason || 'Hoàn hàng'}{r.fee ? ' · ' + money(r.fee) : ''}</Text>
            <CaseBadge status={r.status} text={r.statusText} />
          </View>
        </Card>
      ))}
      {canAny('complaints.create', 'complaints.manage') ? (
        <Button title="Tạo khiếu nại cho đơn này" icon="add-circle-outline" variant="soft" size="md" style={{ marginTop: 8 }}
          onPress={() => navigation.navigate('ComplaintCreate', { trackingCode: o.trackingCode })} />
      ) : null}

      <SectionTitle title="Hành trình" />
      <Card>
        {(o.history || []).length === 0 ? <Text style={{ color: colors.muted }}>Chưa có hành trình</Text> : o.history.map((h, i) => (
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
              {h.location || h.by ? <Text style={styles.tlLoc}>{[h.location, h.by].filter(Boolean).join(' · ')}</Text> : null}
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function Contact({ c, extra }) {
  if (!c) return null;
  return (
    <Card>
      <Text style={styles.cName}>{c.name}</Text>
      <Text style={styles.cPhone}>{c.phone}</Text>
      <Text style={styles.cAddr}>{c.address}</Text>
      <View style={styles.chips}>
        <ActionChip icon="call" label="Gọi" color={colors.success} onPress={() => call(c.phone)} />
        <ActionChip icon="chatbubble-ellipses" label="Nhắn tin" onPress={() => sms(c.phone)} />
        <ActionChip icon="navigate" label="Chỉ đường" onPress={() => navigateTo(c.address)} />
        {extra ? <ActionChip icon="storefront" label={extra.label} color={colors.violet} onPress={() => call(extra.phone)} /> : null}
      </View>
    </Card>
  );
}

const ShipperRow = ({ label, s, last, onOpen }) => (
  <View style={[styles.sRow, !last && { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' }]}>
    <Pressable onPress={onOpen} disabled={!onOpen} style={{ flex: 1 }}>
      <Text style={styles.sLbl}>{label}</Text>
      <Text style={styles.sName}>{s.name}</Text>
      <Text style={styles.sPhone}>{s.phone}</Text>
    </Pressable>
    <ActionChip icon="call" label="Gọi" color={colors.success} onPress={() => call(s.phone)} />
  </View>
);

const styles = StyleSheet.create({
  code: { fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  created: { fontSize: 12, color: colors.faint, marginTop: 8 },
  wh: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.infoBg, padding: 9, borderRadius: 10 },
  whText: { flex: 1, color: '#155E75', fontSize: 13 },
  warn: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 10, backgroundColor: colors.warningBg, padding: 9, borderRadius: 10 },
  warnText: { flex: 1, color: '#92400E', fontSize: 13 },
  cancel: { color: colors.danger, marginTop: 10, fontSize: 13 },
  cName: { fontSize: 16.5, fontWeight: '700', color: colors.text },
  cPhone: { fontSize: 15, color: colors.brand600, fontWeight: '600', marginTop: 3 },
  cAddr: { fontSize: 14, color: colors.text2, marginTop: 6, lineHeight: 20 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  sRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  sLbl: { fontSize: 11.5, color: colors.faint },
  sName: { fontSize: 15, fontWeight: '700', color: colors.text },
  sPhone: { fontSize: 13, color: colors.muted },
  proofText: { fontSize: 13.5, color: colors.text2 },
  proof: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#E2E8F0' },
  link: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  tl: { flexDirection: 'row', gap: 12 },
  tlCol: { alignItems: 'center', width: 14 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#CBD5E1', borderWidth: 3, borderColor: '#F1F5F9', marginTop: 3 },
  tlLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginTop: 2 },
  tlTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text2, flex: 1 },
  tlTime: { fontSize: 12, color: colors.faint },
  tlNote: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  tlLoc: { fontSize: 12, color: colors.faint, marginTop: 2 },
});
