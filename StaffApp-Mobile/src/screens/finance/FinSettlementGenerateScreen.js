/** Lập bảng đối soát – DTO FinGenerateRequest: customerId, from, to (yyyy-MM-dd), includeUnremitted */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { staff } from '../../api';
import { confirmAsk, hapticOk } from '../../hooks';
import { colors } from '../../theme';
import { addDays, isoDay, money, monthEnd, monthStart } from '../../format';
import { Button, Card, Chips, ToggleRow } from '../../components/ui';
import PickField from '../../components/PickField';
import DateField from '../../components/DateField';

const PRESETS = [
  { key: 'yesterday', label: 'Hôm qua', range: () => [addDays(-1), addDays(-1)] },
  { key: '7d', label: '7 ngày qua', range: () => [addDays(-7), addDays(-1)] },
  { key: 'month', label: 'Tháng này', range: () => [monthStart(), new Date()] },
  { key: 'last', label: 'Tháng trước', range: () => [monthStart(new Date(), -1), monthEnd(new Date(), -1)] },
];

export default function FinSettlementGenerateScreen({ navigation }) {
  const [customers, setCustomers] = useState(null);
  const [cErr, setCErr] = useState('');
  const [cust, setCust] = useState(null);
  const [from, setFrom] = useState(isoDay(addDays(-7)));
  const [to, setTo] = useState(isoDay(addDays(-1)));
  const [preset, setPreset] = useState('7d');
  const [unremitted, setUnremitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (q) => {
    try { setCustomers((await staff.finCustomers(q)).items || []); setCErr(''); } catch (e) { setCErr(e.message); setCustomers([]); }
  }, []);
  useEffect(() => { search(''); }, [search]);

  const applyPreset = (k) => {
    const p = PRESETS.find((x) => x.key === k);
    const [a, b] = p.range();
    setPreset(k); setFrom(isoDay(a)); setTo(isoDay(b));
  };

  const submit = async () => {
    if (!cust) return Alert.alert('Thiếu thông tin', 'Chọn shop cần đối soát');
    if (to < from) return Alert.alert('Kỳ không hợp lệ', 'Ngày kết thúc phải sau ngày bắt đầu');
    if (!(await confirmAsk('Lập bảng đối soát', `Lập đối soát cho ${cust.name}\nKỳ ${from.split('-').reverse().join('/')} – ${to.split('-').reverse().join('/')}?`, 'Lập bảng'))) return;
    setBusy(true);
    try {
      const r = await staff.finGenerate({ customerId: cust.id, from, to, includeUnremitted: unremitted });
      hapticOk();
      navigation.replace('FinSettlementDetail', { id: r.data.id });
      Alert.alert('Đã lập bảng đối soát', r.message);
    } catch (e) { Alert.alert('Không lập được', e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card style={{ paddingBottom: 4 }}>
        <PickField label="Shop / khách hàng" title="Chọn shop" items={customers} value={cust?.id} onChange={setCust} icon="storefront-outline"
          loading={customers == null} error={cErr} onSearch={search} placeholder="Chọn shop"
          getLabel={(c) => `${c.name} (${c.code})`}
          getSub={(c) => [c.phone, c.cycleText, `${c.pendingOrders} đơn chờ đối soát`, `công nợ ${money(c.balance)}`].filter(Boolean).join(' · ')}
          getSearch={(c) => [c.name, c.code, c.phone].join(' ')} />
        {cust ? (
          <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: -6, marginBottom: 12 }}>
            {cust.pendingOrders} đơn đã giao / hoàn chưa đối soát · chu kỳ {cust.cycleText}{cust.bank ? ` · TK ${cust.bank}` : ''}
          </Text>
        ) : null}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 }}>Kỳ đối soát</Text>
        <Chips items={PRESETS} value={preset} onChange={applyPreset} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <DateField label="Từ ngày" value={from} onChange={(v) => { setFrom(v); setPreset(null); }} style={{ flex: 1 }} max={isoDay(new Date())} />
          <DateField label="Đến ngày" value={to} onChange={(v) => { setTo(v); setPreset(null); }} style={{ flex: 1 }} max={isoDay(new Date())} />
        </View>
      </Card>
      <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <ToggleRow label="Gồm đơn COD chưa nộp về công ty" sub="Mặc định chỉ lấy đơn COD shipper đã nộp tiền" value={unremitted} onChange={setUnremitted} last />
      </Card>
      <Button title="Lập bảng đối soát" icon="git-compare" loading={busy} onPress={submit} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}
