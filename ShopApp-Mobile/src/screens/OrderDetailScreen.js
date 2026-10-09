import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { getLookups } from '../lookups';
import { colors, font, genericColor, statusColor } from '../theme';
import { addDays, date, dt, isoDay, kg, money, weekday } from '../format';
import {
  ActionChip, Badge, Button, Card, Chip, ChipWrap, Divider, Empty, ErrorBanner, Field, Loading, Row, SectionTitle, Sheet, StatusBadge,
  call, hapticError, hapticSuccess, sms,
} from '../components/ui';

export default function OrderDetailScreen({ navigation, route }) {
  const id = route.params?.id;
  const insets = useSafeAreaInsets();
  const { data: res, loading, refreshing, error, reload, refresh, silent } = useLoad(() => api.order(id), [id], { refetchOnFocus: true });
  const o = res?.data;
  const [lk, setLk] = useState(null);
  const [sheet, setSheet] = useState(null); // 'cancel' | 'redeliver' | 'return'
  const [reasonId, setReasonId] = useState(null);
  const [text, setText] = useState('');
  const [dayOffset, setDayOffset] = useState(1);
  const [busy, setBusy] = useState('');
  const [photo, setPhoto] = useState(null);

  useEffect(() => { getLookups().then(setLk).catch(() => {}); }, []);

  const share = () => {
    if (!o) return;
    Share.share({
      message: `Mã vận đơn Courier Express: ${o.trackingCode}\nNgười nhận: ${o.receiver?.name || ''}\nTrạng thái: ${o.statusText}`,
    }).catch(() => {});
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: o?.trackingCode || 'Chi tiết đơn hàng',
      headerRight: () => (o ? (
        <Pressable onPress={share} hitSlop={10} style={{ paddingHorizontal: 4 }}>
          <Ionicons name="share-outline" size={22} color={colors.brand600} />
        </Pressable>
      ) : null),
    });
  }, [navigation, o]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSheet = (k) => { setReasonId(null); setText(''); setDayOffset(1); setSheet(k); };

  const run = async (key, fn, after) => {
    setBusy(key);
    try {
      const r = await fn();
      hapticSuccess();
      setSheet(null);
      Alert.alert('Thành công', r?.message || 'Đã cập nhật');
      if (after) after(r); else silent();
    } catch (e) {
      hapticError();
      Alert.alert('Không thực hiện được', e.message);
    } finally { setBusy(''); }
  };

  const confirm = () => Alert.alert('Chốt đơn', `Chốt đơn ${o.trackingCode}? Cước sẽ được khóa và bưu cục sẽ đến lấy hàng.`, [
    { text: 'Để sau', style: 'cancel' },
    { text: 'Chốt đơn', onPress: () => run('confirm', () => api.confirmOrder(o.id)) },
  ]);

  const submitCancel = () => {
    if (!reasonId && !text.trim()) { Alert.alert('Thiếu lý do', 'Chọn hoặc nhập lý do hủy đơn.'); return; }
    run('cancel', () => api.cancelOrder(o.id, { reasonId, reason: text.trim() || null }));
  };
  const submitRedeliver = () => run('redeliver', () => api.redeliver(o.id, { date: isoDay(addDays(dayOffset)), note: text.trim() || null }));
  const submitReturn = () => {
    if (!reasonId && !text.trim()) { Alert.alert('Thiếu lý do', 'Chọn hoặc nhập lý do hoàn hàng.'); return; }
    Alert.alert('Yêu cầu hoàn hàng', 'Đơn sẽ được chuyển hoàn về shop và có thể phát sinh phí hoàn. Tiếp tục?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Gửi yêu cầu', style: 'destructive', onPress: () => run('return', () => api.requestReturn(o.id, { reasonId, reason: text.trim() || null })) },
    ]);
  };

  const clone = async () => {
    setBusy('clone');
    try {
      const r = await api.cloneData(o.id);
      navigation.push('CreateOrder', { prefill: r.data, ts: Date.now() });
    } catch (e) { Alert.alert('Không nhân bản được', e.message); } finally { setBusy(''); }
  };

  if (loading && !o) return <Loading />;
  if (!o) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <ErrorBanner message={error || 'Không tải được đơn hàng'} onRetry={reload} />
      </View>
    );
  }

  const actions = o.actions || [];
  const has = (a) => actions.includes(a);
  const sc = statusColor(o.status);
  const lines = o.fees?.lines || [];
  const item = o.item || {};
  const dims = item.length || item.width || item.height ? `${item.length || 0}×${item.width || 0}×${item.height || 0} cm` : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 12 }} />

        {/* Trạng thái */}
        <View style={[styles.hero, { backgroundColor: sc.bg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.heroIcon, { backgroundColor: '#fff' }]}><Ionicons name="cube" size={22} color={sc.fg} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroStatus, { color: sc.fg }]}>{o.statusText}</Text>
              <Text style={styles.heroSub}>{o.service}{o.fees?.zone ? ' · ' + o.fees.zone : ''}</Text>
            </View>
          </View>
          <Text style={styles.heroCode} selectable>{o.trackingCode}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {o.referenceCode ? <Badge text={'Mã shop: ' + o.referenceCode} fg={colors.text2} bg="rgba(255,255,255,0.7)" /> : null}
            <Badge text={'Tạo ' + dt(o.createdAt)} fg={colors.text2} bg="rgba(255,255,255,0.7)" />
            {o.isPriceLocked ? <Badge icon="lock-closed" text="Đã khóa cước" fg={colors.text2} bg="rgba(255,255,255,0.7)" /> : null}
          </View>
          {o.lastFailReason && (o.status === 'DeliveryFailed' || o.status === 'Rescheduled') ? (
            <View style={styles.failBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={{ flex: 1, color: '#991B1B', fontSize: 13.5 }}>
                {o.lastFailReason}{o.failedAttempts ? ` · giao thất bại ${o.failedAttempts} lần` : ''}
                {o.nextDeliveryDate ? `\nHẹn giao lại: ${date(o.nextDeliveryDate)}` : ''}
              </Text>
            </View>
          ) : null}
          {o.cancelReason ? <Text style={{ marginTop: 8, color: '#991B1B', fontSize: 13.5 }}>Lý do hủy: {o.cancelReason}</Text> : null}
        </View>

        {/* Thao tác */}
        {actions.length ? (
          <View style={styles.actions}>
            {has('confirm') ? <Button title="Chốt đơn" icon="checkmark-circle" onPress={confirm} loading={busy === 'confirm'} style={styles.actionFull} /> : null}
            {has('redeliver') ? <Button title="Giao lại" icon="refresh" onPress={() => openSheet('redeliver')} style={styles.actionHalf} size="md" /> : null}
            {has('return') ? <Button title="Hoàn hàng" icon="return-down-back" variant="outline" onPress={() => openSheet('return')} style={styles.actionHalf} size="md" /> : null}
            {has('clone') ? <Button title="Nhân bản" icon="copy-outline" variant="soft" onPress={clone} loading={busy === 'clone'} style={styles.actionHalf} size="md" /> : null}
            {has('complaint') ? (
              <Button title="Khiếu nại" icon="chatbubble-ellipses-outline" variant="soft" style={styles.actionHalf} size="md"
                onPress={() => navigation.navigate('CreateComplaint', { trackingCode: o.trackingCode, scannedCode: o.trackingCode })} />
            ) : null}
            {has('cancel') ? <Button title="Hủy đơn" icon="close-circle-outline" variant="danger" onPress={() => openSheet('cancel')} style={styles.actionHalf} size="md" /> : null}
          </View>
        ) : null}

        {/* Shipper */}
        {o.shipper ? (
          <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.avatar}><Ionicons name="bicycle" size={20} color={colors.brand600} /></View>
            <View style={{ flex: 1 }}>
              <Text style={font.small}>{o.status === 'Delivering' ? 'Shipper đang giao' : 'Shipper đến lấy hàng'}</Text>
              <Text style={font.h3}>{o.shipper.name}</Text>
              {o.shipper.phone ? <Text style={font.small}>{o.shipper.phone}</Text> : null}
            </View>
            {o.shipper.phone ? <ActionChip icon="call" label="Gọi" onPress={() => call(o.shipper.phone)} /> : null}
          </Card>
        ) : null}

        {/* Người gửi / nhận */}
        <SectionTitle title="Người gửi & người nhận" />
        <Card>
          <Party icon="arrow-up-circle" color={colors.info} title="Người gửi" p={o.sender} />
          <Divider style={{ marginVertical: 12 }} />
          <Party icon="arrow-down-circle" color={colors.brand} title="Người nhận" p={o.receiver} withActions />
          {o.note ? <><Divider style={{ marginVertical: 12 }} /><Text style={font.small}>Ghi chú: <Text style={{ color: colors.text2 }}>{o.note}</Text></Text></> : null}
        </Card>

        {/* Hàng hóa */}
        <SectionTitle title="Hàng hóa" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row icon="pricetag-outline" label="Tên hàng" value={item.name || '—'} />
          <Row icon="layers-outline" label="Số lượng" value={String(item.quantity || 1)} />
          <Row icon="barbell-outline" label="Khối lượng" value={kg(item.weight) + (item.chargeableWeight && item.chargeableWeight !== item.weight ? ` (tính cước ${kg(item.chargeableWeight)})` : '')} />
          {dims ? <Row icon="cube-outline" label="Kích thước" value={dims} /> : null}
          <Row icon="shield-checkmark-outline" label="Giá trị khai báo" value={money(item.declaredValue)} />
          <Row icon="warning-outline" label="Hàng dễ vỡ" value={item.isFragile ? 'Có' : 'Không'} last />
        </Card>

        {/* Tiền & cước */}
        <SectionTitle title="Tiền thu hộ & cước phí" />
        <Card>
          <View style={styles.codRow}>
            <View style={{ flex: 1 }}>
              <Text style={font.small}>Tiền thu hộ (COD)</Text>
              <Text style={styles.codValue}>{money(o.codAmount)}</Text>
              {o.codCollected ? <Text style={font.small}>Đã thu: {money(o.codCollected)}</Text> : null}
            </View>
            {o.codAmount > 0 ? <Badge text={o.codStatusText} fg={colors.brand600} bg={colors.brand100} /> : null}
          </View>
          <Divider style={{ marginVertical: 12 }} />
          {lines.length ? lines.map((l, i) => (
            <View key={i} style={styles.feeLine}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeName}>{l.name}</Text>
                {l.formula ? <Text style={styles.feeFormula}>{l.formula}</Text> : null}
              </View>
              <Text style={styles.feeAmt}>{money(l.amount)}</Text>
            </View>
          )) : (
            <>
              <FeeLine name="Cước chính" v={o.fees?.baseFee} />
              <FeeLine name="Phí COD" v={o.fees?.codFee} />
              <FeeLine name="Phí bảo hiểm" v={o.fees?.insuranceFee} />
              <FeeLine name="Phí vùng xa" v={o.fees?.remoteFee} />
              <FeeLine name="Phí lấy hàng" v={o.fees?.pickupFee} />
              <FeeLine name="Phí cồng kềnh" v={o.fees?.bulkyFee} />
              <FeeLine name="Phí khác" v={o.fees?.otherFee} />
            </>
          )}
          <FeeLine name="Phí giao lại" v={o.fees?.redeliveryFee} />
          <FeeLine name="Phí hoàn hàng" v={o.fees?.returnFee} />
          <View style={styles.totalRow}>
            <Text style={font.h3}>Tổng cước</Text>
            <Text style={styles.total}>{money(o.fees?.totalFee)}</Text>
          </View>
          <Text style={[font.small, { marginTop: 4 }]}>{o.paymentText}</Text>
          {o.settlement ? (
            <Pressable onPress={() => navigation.navigate('Settlement', { id: o.settlement.id })} style={styles.settleLink}>
              <Ionicons name="document-text-outline" size={18} color={colors.brand600} />
              <Text style={{ flex: 1, color: colors.brand600, fontWeight: '600' }}>Phiên đối soát {o.settlement.code} · {o.settlement.statusText}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.brand600} />
            </Pressable>
          ) : null}
        </Card>

        {/* Bằng chứng giao hàng */}
        {o.status === 'Delivered' || o.proofPhoto || o.signature ? (
          <>
            <SectionTitle title="Xác nhận giao hàng" />
            <Card>
              {o.deliveredAt ? <Text style={font.body}>Giao lúc {dt(o.deliveredAt)}</Text> : null}
              {o.recipient ? <Text style={[font.small, { marginTop: 2 }]}>Người nhận: {o.recipient}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {o.proofPhoto ? (
                  <Pressable onPress={() => setPhoto(o.proofPhoto)} style={{ flex: 1 }}>
                    <Image source={{ uri: o.proofPhoto }} style={styles.proof} />
                    <Text style={styles.proofLabel}>Ảnh giao hàng</Text>
                  </Pressable>
                ) : null}
                {o.signature ? (
                  <Pressable onPress={() => setPhoto(o.signature)} style={{ flex: 1 }}>
                    <Image source={{ uri: o.signature }} resizeMode="contain" style={[styles.proof, { backgroundColor: '#fff' }]} />
                    <Text style={styles.proofLabel}>Chữ ký</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          </>
        ) : null}

        {/* Hoàn hàng & khiếu nại */}
        {(o.returns || []).length ? (
          <>
            <SectionTitle title="Yêu cầu hoàn hàng" />
            {o.returns.map((r) => (
              <Card key={r.id} style={{ marginBottom: 8 }} onPress={() => navigation.navigate('Returns')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[font.h3, { flex: 1 }]}>{r.code}</Text>
                  <StatusBadge status={r.status} text={r.statusText} colorFn={genericColor} />
                </View>
                {r.reason ? <Text style={[font.small, { marginTop: 4 }]}>{r.reason}</Text> : null}
                <Text style={[font.small, { marginTop: 2 }]}>Phí hoàn: {money(r.fee)}</Text>
              </Card>
            ))}
          </>
        ) : null}
        {(o.complaints || []).length ? (
          <>
            <SectionTitle title="Khiếu nại" />
            {o.complaints.map((c) => (
              <Card key={c.id} style={{ marginBottom: 8 }} onPress={() => navigation.navigate('ComplaintDetail', { id: c.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[font.h3, { flex: 1 }]} numberOfLines={1}>{c.code}</Text>
                  <Badge text={c.statusText} />
                </View>
                <Text style={[font.small, { marginTop: 4 }]} numberOfLines={2}>{c.title}</Text>
              </Card>
            ))}
          </>
        ) : null}

        {/* Hành trình */}
        <SectionTitle title="Hành trình đơn hàng" />
        <Card>
          {(o.history || []).length ? o.history.map((h, i) => (
            <View key={i} style={styles.tl}>
              <View style={{ alignItems: 'center', width: 18 }}>
                <View style={[styles.dot, i === 0 && { backgroundColor: colors.brand, borderColor: colors.brand100 }]} />
                {i < o.history.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: i < o.history.length - 1 ? 16 : 0 }}>
                <Text style={[styles.tlTitle, i === 0 && { color: colors.brand600 }]}>{h.statusText}</Text>
                <Text style={styles.tlTime}>{dt(h.time)}{h.location ? ' · ' + h.location : ''}</Text>
                {h.note ? <Text style={styles.tlNote}>{h.note}</Text> : null}
              </View>
            </View>
          )) : <Empty icon="time-outline" title="Chưa có hành trình" />}
        </Card>
        {o.warehouse ? <Text style={[font.small, { marginTop: 8, textAlign: 'center' }]}>Đang ở: {o.warehouse}</Text> : null}
      </ScrollView>

      {/* Hủy đơn */}
      <Sheet visible={sheet === 'cancel'} onClose={() => setSheet(null)} title="Hủy đơn hàng"
        footer={<Button title="Xác nhận hủy đơn" variant="dangerSolid" icon="close-circle" onPress={submitCancel} loading={busy === 'cancel'} />}>
        <Text style={[font.small, { marginBottom: 10 }]}>Chọn lý do hủy</Text>
        <ChipWrap style={{ marginBottom: 14 }}>
          {(lk?.cancelReasons || []).map((r) => <Chip key={r.id} label={r.name} active={reasonId === r.id} onPress={() => setReasonId(reasonId === r.id ? null : r.id)} />)}
        </ChipWrap>
        <Field label="Ghi chú thêm" value={text} onChangeText={setText} placeholder="Lý do khác..." multiline />
      </Sheet>

      {/* Giao lại */}
      <Sheet visible={sheet === 'redeliver'} onClose={() => setSheet(null)} title="Yêu cầu giao lại"
        footer={<Button title="Gửi yêu cầu giao lại" icon="refresh" onPress={submitRedeliver} loading={busy === 'redeliver'} />}>
        <Text style={[font.small, { marginBottom: 10 }]}>Chọn ngày giao lại</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[1, 2, 3].map((n) => {
            const d = addDays(n);
            const active = dayOffset === n;
            return (
              <Pressable key={n} onPress={() => setDayOffset(n)} style={[styles.dayBox, active && styles.dayActive]}>
                <Text style={[styles.dayW, active && { color: '#fff' }]}>{n === 1 ? 'Ngày mai' : weekday(d)}</Text>
                <Text style={[styles.dayD, active && { color: '#fff' }]}>{date(d).slice(0, 5)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Ghi chú cho shipper" value={text} onChangeText={setText} placeholder="VD: Gọi trước 30 phút, giao giờ hành chính..." multiline />
      </Sheet>

      {/* Hoàn hàng */}
      <Sheet visible={sheet === 'return'} onClose={() => setSheet(null)} title="Yêu cầu hoàn hàng"
        footer={<Button title="Gửi yêu cầu hoàn" variant="dark" icon="return-down-back" onPress={submitReturn} loading={busy === 'return'} />}>
        <Text style={[font.small, { marginBottom: 10 }]}>Chọn lý do hoàn</Text>
        <ChipWrap style={{ marginBottom: 14 }}>
          {(lk?.returnReasons || []).map((r) => <Chip key={r.id} label={r.name} active={reasonId === r.id} onPress={() => setReasonId(reasonId === r.id ? null : r.id)} />)}
        </ChipWrap>
        <Field label="Ghi chú thêm" value={text} onChangeText={setText} placeholder="Lý do khác..." multiline />
      </Sheet>

      {/* Xem ảnh */}
      <Modal visible={!!photo} transparent animationType="fade" onRequestClose={() => setPhoto(null)}>
        <Pressable style={styles.viewer} onPress={() => setPhoto(null)}>
          {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
          <Text style={{ color: '#fff', marginTop: 12 }}>Chạm để đóng</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const Party = ({ icon, color, title, p, withActions }) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>
    <Ionicons name={icon} size={22} color={color} />
    <View style={{ flex: 1 }}>
      <Text style={font.small}>{title}</Text>
      <Text style={[font.h3, { marginTop: 1 }]}>{p?.name || '—'}</Text>
      {p?.phone ? <Text style={[font.body, { marginTop: 1 }]}>{p.phone}</Text> : null}
      {p?.address ? <Text style={[font.small, { marginTop: 3, lineHeight: 18 }]}>{p.address}</Text> : null}
      {withActions && p?.phone ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <ActionChip icon="call" label="Gọi" onPress={() => call(p.phone)} />
          <ActionChip icon="chatbubble-outline" label="Nhắn tin" onPress={() => sms(p.phone)} />
        </View>
      ) : null}
    </View>
    {!withActions && p?.phone ? <ActionChip icon="call" label="Gọi" onPress={() => call(p.phone)} /> : null}
  </View>
);

const FeeLine = ({ name, v }) => (!v ? null : (
  <View style={styles.feeLine}>
    <Text style={[styles.feeName, { flex: 1 }]}>{name}</Text>
    <Text style={styles.feeAmt}>{money(v)}</Text>
  </View>
));

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: 16 },
  heroIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  heroStatus: { fontSize: 18, fontWeight: '800' },
  heroSub: { fontSize: 13, color: colors.text2, marginTop: 1 },
  heroCode: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.5, marginTop: 14 },
  failBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionFull: { width: '100%' },
  actionHalf: { flexGrow: 1, flexBasis: '45%' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  codRow: { flexDirection: 'row', alignItems: 'flex-start' },
  codValue: { fontSize: 22, fontWeight: '800', color: colors.brand600, marginTop: 2 },
  feeLine: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 10 },
  feeName: { fontSize: 14, color: colors.text2 },
  feeFormula: { fontSize: 11.5, color: colors.faint, marginTop: 1 },
  feeAmt: { fontSize: 14, color: colors.text, fontWeight: '600' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF1F6', marginTop: 8, paddingTop: 10 },
  total: { fontSize: 18, fontWeight: '800', color: colors.text },
  settleLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: colors.brand50 },
  proof: { width: '100%', height: 150, borderRadius: 12, backgroundColor: '#EEF2F7' },
  proofLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' },
  tl: { flexDirection: 'row', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#CBD5E1', borderWidth: 3, borderColor: '#EEF2F7', marginTop: 3 },
  line: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 2 },
  tlTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  tlTime: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  tlNote: { fontSize: 13, color: colors.text2, marginTop: 3 },
  dayBox: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#fff' },
  dayActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayW: { fontSize: 13, fontWeight: '700', color: colors.text2 },
  dayD: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
});
