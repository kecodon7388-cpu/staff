import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuth } from '../auth';
import { useDebounced } from '../hooks';
import { getLookups } from '../lookups';
import { colors, font, shadowLg } from '../theme';
import { money, moneyInput, parseDecimal, parseMoney } from '../format';
import { Button, Card, Chip, ChipWrap, ErrorBanner, Field, Loading, Notice, Segmented, SectionTitle, SelectField, ToggleRow, hapticError, hapticSuccess } from '../components/ui';
import PickerModal from '../components/PickerModal';
import LocationPicker from '../components/LocationPicker';

const str = (v) => (v === null || v === undefined || v === 0 ? '' : String(v));
const decStr = (v) => (v ? String(v).replace('.', ',') : '');

export default function CreateOrderScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const prefill = route.params?.prefill;

  const [lk, setLk] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const [ready, setReady] = useState(false);

  // Người gửi
  const [pickupAddressId, setPickupAddressId] = useState(null);
  const [manualSender, setManualSender] = useState(false);
  const [sender, setSender] = useState({ name: '', phone: '', address: '' });
  const [sloc, setSloc] = useState({ provinceId: null, districtId: null, wardId: null });
  const [addrOpen, setAddrOpen] = useState(false);

  // Người nhận
  const [receiver, setReceiver] = useState({ name: '', phone: '', address: '' });
  const [rloc, setRloc] = useState({ provinceId: null, districtId: null, wardId: null });

  // Hàng hóa & dịch vụ
  const [serviceId, setServiceId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [weight, setWeight] = useState('0,5');
  const [showDims, setShowDims] = useState(false);
  const [dims, setDims] = useState({ l: '', w: '', h: '' });
  const [declaredValue, setDeclaredValue] = useState('');
  const [codAmount, setCodAmount] = useState('');
  const [paymentBy, setPaymentBy] = useState('SENDER');
  const [isFragile, setIsFragile] = useState(false);
  const [requirePickup, setRequirePickup] = useState(true);
  const [note, setNote] = useState('');
  const [referenceCode, setReferenceCode] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [submitting, setSubmitting] = useState(''); // 'draft' | 'confirm'
  const quoteSeq = useRef(0);

  // Tải danh mục + sổ địa chỉ, áp dữ liệu nhân bản (nếu có)
  const init = async () => {
    setLoadErr('');
    try {
      const [l, a] = await Promise.all([getLookups(), api.addresses()]);
      const pickups = (a.items || []).filter((x) => x.type === 'Pickup');
      setLk(l);
      setAddresses(pickups);
      const def = pickups.find((x) => x.isDefault) || pickups[0];
      if (prefill) {
        const pa = prefill.pickupAddressId && pickups.find((x) => x.id === prefill.pickupAddressId);
        if (pa) { setPickupAddressId(pa.id); setManualSender(false); } else {
          setManualSender(true);
          setPickupAddressId(null);
        }
        setSender({ name: prefill.senderName || '', phone: prefill.senderPhone || '', address: prefill.senderAddress || '' });
        setSloc({ provinceId: prefill.senderProvinceId || null, districtId: prefill.senderDistrictId || null, wardId: prefill.senderWardId || null });
        setReceiver({ name: prefill.receiverName || '', phone: prefill.receiverPhone || '', address: prefill.receiverAddress || '' });
        setRloc({ provinceId: prefill.receiverProvinceId || null, districtId: prefill.receiverDistrictId || null, wardId: prefill.receiverWardId || null });
        setServiceId(prefill.serviceId || l.services[0]?.id || null);
        setItemName(prefill.itemName || '');
        setQuantity(String(prefill.quantity || 1));
        setWeight(decStr(prefill.weight) || '0,5');
        if (prefill.length || prefill.width || prefill.height) {
          setShowDims(true);
          setDims({ l: decStr(prefill.length), w: decStr(prefill.width), h: decStr(prefill.height) });
        }
        setDeclaredValue(moneyInput(str(prefill.declaredValue)));
        setCodAmount(moneyInput(str(prefill.codAmount)));
        setPaymentBy(prefill.paymentBy === 'RECEIVER' ? 'RECEIVER' : 'SENDER');
        setIsFragile(!!prefill.isFragile);
        setRequirePickup(prefill.requirePickup !== false);
        setNote(prefill.note || '');
      } else {
        setServiceId(l.services[0]?.id || null);
        if (def) setPickupAddressId(def.id);
        else {
          setManualSender(true);
          const shop = profile?.shop;
          if (shop) setSender({ name: shop.name || '', phone: shop.phone || '', address: shop.address || '' });
        }
      }
      setReady(true);
    } catch (e) { setLoadErr(e.message); }
  };
  useEffect(() => { init(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickup = addresses.find((a) => a.id === pickupAddressId);
  const useBook = !manualSender && !!pickup;

  const body = useMemo(() => ({
    referenceCode: referenceCode.trim() || null,
    serviceId: serviceId || 0,
    pickupAddressId: useBook ? pickup.id : null,
    senderName: useBook ? pickup.contactName : sender.name,
    senderPhone: useBook ? pickup.phone : sender.phone,
    senderAddress: useBook ? pickup.addressLine : sender.address,
    senderProvinceId: (useBook ? pickup.provinceId : sloc.provinceId) || 0,
    senderDistrictId: (useBook ? pickup.districtId : sloc.districtId) || null,
    senderWardId: (useBook ? pickup.wardId : sloc.wardId) || null,
    receiverName: receiver.name,
    receiverPhone: receiver.phone,
    receiverAddress: receiver.address,
    receiverProvinceId: rloc.provinceId || 0,
    receiverDistrictId: rloc.districtId || null,
    receiverWardId: rloc.wardId || null,
    itemName,
    quantity: Math.max(1, parseInt(quantity, 10) || 1),
    declaredValue: parseMoney(declaredValue),
    weight: parseDecimal(weight),
    length: showDims ? parseDecimal(dims.l) : 0,
    width: showDims ? parseDecimal(dims.w) : 0,
    height: showDims ? parseDecimal(dims.h) : 0,
    codAmount: parseMoney(codAmount),
    paymentBy,
    isFragile,
    requirePickup,
    note: note.trim() || null,
  }), [referenceCode, serviceId, useBook, pickup, sender, sloc, receiver, rloc, itemName, quantity, declaredValue, weight, showDims, dims, codAmount, paymentBy, isFragile, requirePickup, note]);

  // Chỉ các trường ảnh hưởng tới cước mới kích hoạt tính lại
  const quoteKey = JSON.stringify([body.serviceId, body.pickupAddressId, body.senderProvinceId, body.senderDistrictId, body.senderWardId,
    body.receiverProvinceId, body.receiverDistrictId, body.receiverWardId, body.quantity, body.declaredValue, body.weight,
    body.length, body.width, body.height, body.codAmount, body.paymentBy, body.isFragile, body.requirePickup]);
  const dKey = useDebounced(quoteKey, 600);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  useEffect(() => {
    if (!ready) return;
    const b = bodyRef.current;
    if (!b.serviceId || !b.senderProvinceId || !b.receiverProvinceId || !(b.weight > 0)) {
      setQuote({ success: false, error: 'Chọn dịch vụ, tỉnh gửi, tỉnh nhận và nhập khối lượng để tính cước' });
      return;
    }
    const my = ++quoteSeq.current;
    setQuoting(true);
    api.quote(b)
      .then((r) => { if (my === quoteSeq.current) setQuote(r.quote || null); })
      .catch((e) => { if (my === quoteSeq.current) setQuote({ success: false, error: e.message }); })
      .finally(() => { if (my === quoteSeq.current) setQuoting(false); });
  }, [dKey, ready]);

  const validate = () => {
    const errs = [];
    if (!serviceId) errs.push('Chọn dịch vụ vận chuyển');
    if (!useBook) {
      if (!sender.name.trim() || !sender.phone.trim() || !sender.address.trim()) errs.push('Nhập đủ tên, SĐT, địa chỉ người gửi');
      if (!sloc.provinceId) errs.push('Chọn tỉnh / thành người gửi');
    }
    if (!receiver.name.trim()) errs.push('Nhập tên người nhận');
    if (!receiver.phone.trim()) errs.push('Nhập số điện thoại người nhận');
    if (!receiver.address.trim()) errs.push('Nhập địa chỉ người nhận');
    if (!rloc.provinceId) errs.push('Chọn tỉnh / thành người nhận');
    if (!(parseDecimal(weight) > 0)) errs.push('Nhập khối lượng hàng');
    return errs;
  };

  const submit = async (confirm) => {
    const errs = validate();
    if (errs.length) { hapticError(); Alert.alert('Thiếu thông tin', errs.map((e) => '• ' + e).join('\n')); return; }
    setSubmitting(confirm ? 'confirm' : 'draft');
    try {
      const r = await api.createOrder({ ...body, confirm });
      hapticSuccess();
      navigation.replace('OrderDetail', { id: r.data.id });
      Alert.alert(confirm ? 'Đã tạo & chốt đơn' : 'Đã lưu nháp', r.message || `Mã vận đơn ${r.data.trackingCode}`);
    } catch (e) {
      hapticError();
      Alert.alert('Không tạo được đơn', e.message);
    } finally { setSubmitting(''); }
  };

  if (!ready) {
    return loadErr ? <View style={{ padding: 16 }}><ErrorBanner message={loadErr} onRetry={init} /></View> : <Loading />;
  }

  const services = lk?.services || [];
  const svc = services.find((s) => s.id === serviceId);
  const addrItems = addresses.map((a) => ({
    id: a.id, name: (a.label ? a.label + ' · ' : '') + a.contactName + ' · ' + a.phone, sub: a.full,
  }));
  const cod = parseMoney(codAmount);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {prefill ? <Notice icon="copy-outline" text="Đang tạo đơn mới từ dữ liệu đơn cũ. Kiểm tra lại thông tin trước khi lưu." style={{ marginBottom: 6 }} /> : null}

        {/* Người gửi */}
        <SectionTitle title="Người gửi / lấy hàng" style={{ marginTop: 6 }} right={addresses.length ? (
          <Pressable hitSlop={8} onPress={() => setManualSender(!manualSender)}>
            <Text style={styles.link}>{manualSender ? 'Chọn từ sổ địa chỉ' : 'Nhập người gửi khác'}</Text>
          </Pressable>
        ) : null} />
        <Card>
          {!manualSender && addresses.length ? (
            <>
              <SelectField label="Địa chỉ lấy hàng" icon="storefront-outline" value={pickup ? (pickup.label || pickup.contactName) : ''}
                placeholder="Chọn địa chỉ lấy hàng" onPress={() => setAddrOpen(true)} style={{ marginBottom: pickup ? 10 : 0 }} />
              {pickup ? (
                <View style={styles.addrBox}>
                  <Text style={styles.addrName}>{pickup.contactName} · {pickup.phone}</Text>
                  <Text style={styles.addrFull}>{pickup.full}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {!addresses.length ? (
                <Notice tone="warning" icon="warning" style={{ marginBottom: 14 }} onPress={() => navigation.navigate('Addresses')}
                  text="Chưa có địa chỉ lấy hàng trong sổ. Bấm để thêm, hoặc nhập người gửi bên dưới." />
              ) : null}
              <Field label="Tên người gửi" required icon="person-outline" value={sender.name} onChangeText={(v) => setSender({ ...sender, name: v })} placeholder="Tên shop / người gửi" />
              <Field label="Số điện thoại" required icon="call-outline" value={sender.phone} onChangeText={(v) => setSender({ ...sender, phone: v })} keyboardType="phone-pad" placeholder="09xx xxx xxx" />
              <Field label="Địa chỉ" required icon="home-outline" value={sender.address} onChangeText={(v) => setSender({ ...sender, address: v })} placeholder="Số nhà, tên đường..." />
              <LocationPicker provinces={lk?.provinces} value={sloc} onChange={setSloc} required />
            </>
          )}
        </Card>

        {/* Người nhận */}
        <SectionTitle title="Người nhận" />
        <Card>
          <Field label="Họ tên" required icon="person-outline" value={receiver.name} onChangeText={(v) => setReceiver({ ...receiver, name: v })} placeholder="Tên người nhận" />
          <Field label="Số điện thoại" required icon="call-outline" value={receiver.phone} onChangeText={(v) => setReceiver({ ...receiver, phone: v })} keyboardType="phone-pad" placeholder="09xx xxx xxx" />
          <Field label="Địa chỉ" required icon="home-outline" value={receiver.address} onChangeText={(v) => setReceiver({ ...receiver, address: v })} placeholder="Số nhà, tên đường, thôn/xóm..." />
          <LocationPicker provinces={lk?.provinces} value={rloc} onChange={setRloc} required />
        </Card>

        {/* Dịch vụ */}
        <SectionTitle title="Dịch vụ vận chuyển" />
        <ChipWrap>
          {services.map((s) => (
            <Chip key={s.id} label={s.name} active={serviceId === s.id} onPress={() => setServiceId(s.id)} />
          ))}
        </ChipWrap>
        {svc ? <Text style={[font.small, { marginTop: 8 }]}>{[svc.leadTime ? 'Thời gian: ' + svc.leadTime : null, svc.description].filter(Boolean).join(' · ')}</Text> : null}

        {/* Hàng hóa */}
        <SectionTitle title="Hàng hóa" />
        <Card>
          <Field label="Tên hàng" icon="pricetag-outline" value={itemName} onChangeText={setItemName} placeholder="VD: Áo thun, mỹ phẩm..." />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field style={{ flex: 1 }} label="Số lượng" value={quantity} onChangeText={(v) => setQuantity(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" />
            <Field style={{ flex: 1 }} label="Khối lượng (kg)" required value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0,5" />
          </View>
          <Pressable onPress={() => setShowDims(!showDims)} style={styles.dimToggle}>
            <Ionicons name={showDims ? 'remove-circle-outline' : 'add-circle-outline'} size={18} color={colors.brand600} />
            <Text style={styles.link}>{showDims ? 'Bỏ kích thước' : 'Thêm kích thước (D × R × C, cm)'}</Text>
          </Pressable>
          {showDims ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Field style={{ flex: 1 }} label="Dài" value={dims.l} onChangeText={(v) => setDims({ ...dims, l: v })} keyboardType="decimal-pad" placeholder="cm" />
              <Field style={{ flex: 1 }} label="Rộng" value={dims.w} onChangeText={(v) => setDims({ ...dims, w: v })} keyboardType="decimal-pad" placeholder="cm" />
              <Field style={{ flex: 1 }} label="Cao" value={dims.h} onChangeText={(v) => setDims({ ...dims, h: v })} keyboardType="decimal-pad" placeholder="cm" />
            </View>
          ) : null}
          <Field label="Giá trị khai báo" icon="shield-checkmark-outline" value={declaredValue} onChangeText={(v) => setDeclaredValue(moneyInput(v))}
            keyboardType="number-pad" placeholder="0" right={<Text style={styles.unit}>đ</Text>} hint="Dùng để tính phí bảo hiểm & bồi thường" style={{ marginTop: 6 }} />
          <ToggleRow icon="warning-outline" label="Hàng dễ vỡ" value={isFragile} onValueChange={setIsFragile} last />
        </Card>

        {/* Tiền thu hộ */}
        <SectionTitle title="Thu hộ & thanh toán" />
        <Card>
          <Field label="Tiền thu hộ (COD)" icon="cash-outline" value={codAmount} onChangeText={(v) => setCodAmount(moneyInput(v))}
            keyboardType="number-pad" placeholder="0" right={<Text style={styles.unit}>đ</Text>} inputStyle={{ fontWeight: '700', color: colors.brand600 }} />
          <Text style={styles.label}>Người trả cước</Text>
          <Segmented items={[{ key: 'SENDER', label: 'Người gửi (shop)' }, { key: 'RECEIVER', label: 'Người nhận' }]} value={paymentBy} onChange={setPaymentBy} />
          {paymentBy === 'RECEIVER' && quote?.success ? (
            <Text style={[font.small, { marginTop: 8 }]}>Shipper thu người nhận: {money(cod + (quote.totalFee || 0))} (COD + cước)</Text>
          ) : null}
          <View style={{ marginTop: 6 }}>
            <ToggleRow icon="bicycle-outline" label="Yêu cầu lấy hàng tận nơi" hint="Tắt nếu shop tự mang hàng ra bưu cục" value={requirePickup} onValueChange={setRequirePickup} last />
          </View>
        </Card>

        {/* Khác */}
        <SectionTitle title="Thông tin thêm" />
        <Card>
          <Field label="Mã đơn của shop" icon="barcode-outline" value={referenceCode} onChangeText={setReferenceCode} autoCapitalize="characters" placeholder="Không bắt buộc" />
          <Field label="Ghi chú giao hàng" value={note} onChangeText={setNote} multiline placeholder="VD: Cho xem hàng, không cho thử; gọi trước khi giao..." style={{ marginBottom: 0 }} />
        </Card>
      </ScrollView>

      {/* Thanh cước + nút tạo đơn */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable onPress={() => quote?.success && setShowLines(!showLines)} style={styles.quoteRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteLabel}>Tổng cước dự kiến{quote?.success && quote.leadTime ? ' · ' + quote.leadTime : ''}</Text>
            {quote?.success ? (
              <Text style={styles.quoteValue}>{money(quote.totalFee)}</Text>
            ) : (
              <Text style={styles.quoteErr} numberOfLines={2}>{quote?.error || 'Đang tính cước...'}</Text>
            )}
          </View>
          {quoting ? <ActivityIndicator color={colors.brand} /> : quote?.success ? (
            <Ionicons name={showLines ? 'chevron-down' : 'chevron-up'} size={20} color={colors.muted} />
          ) : null}
        </Pressable>
        {showLines && quote?.success ? (
          <ScrollView style={styles.lines} nestedScrollEnabled>
            {quote.route || quote.zone ? <Text style={[font.small, { marginBottom: 4 }]}>{[quote.zone, quote.route].filter(Boolean).join(' · ')}</Text> : null}
            {quote.chargeableWeight ? <Text style={[font.small, { marginBottom: 6 }]}>KL tính cước: {String(quote.chargeableWeight).replace('.', ',')} kg</Text> : null}
            {(quote.lines || []).map((l, i) => (
              <View key={i} style={styles.line}>
                <Text style={styles.lineName} numberOfLines={1}>{l.name}{l.formula ? <Text style={{ color: colors.faint }}> · {l.formula}</Text> : null}</Text>
                <Text style={styles.lineAmt}>{money(l.amount)}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Button title="Lưu nháp" variant="outline" icon="save-outline" size="md" style={{ flex: 1 }}
            onPress={() => submit(false)} loading={submitting === 'draft'} disabled={!!submitting} />
          <Button title="Tạo & chốt đơn" icon="checkmark-circle" size="md" style={{ flex: 1.4 }}
            onPress={() => submit(true)} loading={submitting === 'confirm'} disabled={!!submitting} />
        </View>
      </View>

      <PickerModal visible={addrOpen} title="Chọn địa chỉ lấy hàng" items={addrItems} value={pickupAddressId}
        searchPlaceholder="Tìm theo tên, SĐT, địa chỉ..." onClose={() => setAddrOpen(false)}
        onSelect={(it) => { setAddrOpen(false); if (it) setPickupAddressId(it.id); }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brand600, fontWeight: '700', fontSize: 13.5 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 },
  unit: { paddingHorizontal: 14, color: colors.muted, fontWeight: '700' },
  addrBox: { backgroundColor: colors.brand50, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.brand100 },
  addrName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  addrFull: { fontSize: 13, color: colors.text2, marginTop: 3, lineHeight: 18 },
  dimToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  bar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, ...shadowLg },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quoteLabel: { fontSize: 12.5, color: colors.muted, fontWeight: '600' },
  quoteValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 1 },
  quoteErr: { fontSize: 13, color: colors.warning, marginTop: 2 },
  lines: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6', maxHeight: 180 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 10 },
  lineName: { flex: 1, fontSize: 13, color: colors.text2 },
  lineAmt: { fontSize: 13, fontWeight: '600', color: colors.text },
});
