/**
 * Chi tiết bảng đối soát: tổng tiền, tài khoản shop, từng đơn, phiếu thanh toán.
 * Thao tác theo data.actions (máy chủ đã kiểm cod.manage): confirm, cancel, pay.
 * Thanh toán – DTO FinPayRequest: method (BankTransfer | Cash), bankRef, note. Số tiền do máy chủ tính = |thực trả|.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useAction, useLoad } from '../../hooks';
import { colors, radius } from '../../theme';
import { date, dt, money } from '../../format';
import { BottomBar, Button, CaseBadge, Card, Field, ListState, Row, SectionTitle, Segmented, Sheet } from '../../components/ui';

export default function FinSettlementDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { can } = useAuth();
  const fn = useCallback(async () => {
    const r = await staff.finSettlement(id);
    navigation.setOptions({ title: r.data.settlement.code });
    return r.data;
  }, [id, navigation]);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { busy, run } = useAction();
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('BankTransfer');
  const [bankRef, setBankRef] = useState('');
  const [note, setNote] = useState('');

  if (!data) return <ListState loading={loading} error={error} onRetry={reload} />;
  const s = data.settlement;
  const a = can('cod.manage') ? data.actions || [] : [];
  const payToShop = s.net >= 0;

  const confirm = () => run('confirm', () => staff.finConfirmSettlement(id), {
    confirm: { title: 'Xác nhận đối soát', text: `Xác nhận ${s.code} cho ${s.shop}: thực trả ${money(s.net)}? Công nợ sẽ được ghi nhận và shop nhận thông báo.`, ok: 'Xác nhận' },
    onDone: reload,
  });
  const cancel = () => run('cancel', () => staff.finCancelSettlement(id), {
    confirm: { title: 'Hủy bảng đối soát', text: `Hủy ${s.code}? Các đơn sẽ được trả lại để đối soát kỳ sau.`, ok: 'Hủy bảng', destructive: true },
    onDone: reload,
  });
  const pay = async () => {
    setPayOpen(false);
    await new Promise((r) => setTimeout(r, 350));
    await run('pay', () => staff.finPaySettlement(id, { method, bankRef: bankRef.trim() || null, note: note.trim() || null }), {
      confirm: {
        title: payToShop ? 'Chi trả cho shop' : 'Thu tiền từ shop',
        text: `${payToShop ? 'Chi trả' : 'Thu'} ${money(Math.abs(s.net))} ${payToShop ? 'cho' : 'từ'} ${s.shop} bằng ${method === 'Cash' ? 'tiền mặt' : 'chuyển khoản'}${bankRef.trim() ? ' (mã GD ' + bankRef.trim() + ')' : ''}?`,
        ok: 'Lập phiếu thanh toán',
      },
      onDone: reload,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data.items}
        keyExtractor={(i) => String(i.orderId)}
        contentContainerStyle={{ padding: 16, paddingBottom: a.length ? 160 : 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={(
          <View>
            <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.shop} numberOfLines={1}>{s.shop} · {s.shopCode}</Text>
                <CaseBadge status={s.status} text={s.statusText} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={styles.netLbl}>{payToShop ? 'Thực trả shop' : 'Shop phải trả công ty'}</Text>
              <Text style={styles.net}>{money(Math.abs(s.net))}</Text>
              <Text style={styles.period}>Kỳ {date(s.from)} – {date(s.to)} · {s.count} đơn</Text>
            </Card>
            <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <Row icon="cash-outline" label="Tổng COD" value={money(s.totalCod)} />
              <Row icon="receipt-outline" label="Cước vận chuyển" value={'− ' + money(s.totalFee)} />
              <Row icon="add-circle-outline" label="Phụ phí" value={'− ' + money(s.totalSurcharge)} />
              <Row icon="return-down-back-outline" label="Phí hoàn" value={'− ' + money(s.totalReturnFee)} />
              <Row icon="wallet-outline" label="Thực trả" value={money(s.net)} valueStyle={{ color: s.net >= 0 ? colors.success : colors.danger, fontSize: 16 }} last />
            </Card>
            <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <Row icon="card-outline" label="Ngân hàng" value={data.bank?.name || '—'} />
              <Row icon="keypad-outline" label="Số tài khoản" value={data.bank?.account || '—'} />
              <Row icon="person-outline" label="Chủ tài khoản" value={data.bank?.holder || '—'} last={!s.confirmedAt && !s.paidAt} />
              {s.confirmedAt ? <Row icon="checkmark-done-outline" label="Xác nhận" value={`${s.confirmedBy || ''} · ${dt(s.confirmedAt)}`} last={!s.paidAt} /> : null}
              {s.paidAt ? <Row icon="cash-outline" label="Thanh toán" value={dt(s.paidAt)} last /> : null}
            </Card>
            {data.payments?.length ? (
              <>
                <SectionTitle title="Phiếu thanh toán" />
                <Card padded={false}>
                  {data.payments.map((p, i) => (
                    <View key={p.code} style={[styles.pay, i < data.payments.length - 1 && styles.border]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.iCode}>{p.code}</Text>
                        <Text style={styles.iSub}>{p.directionText} · {p.methodText}{p.bankRef ? ' · ' + p.bankRef : ''} · {dt(p.paidAt)}</Text>
                      </View>
                      <Text style={styles.iAmt}>{money(p.amount)}</Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
            <SectionTitle title={`Chi tiết đơn (${data.items.length})`} />
          </View>
        )}
        renderItem={({ item: i }) => (
          <Pressable onPress={() => navigation.navigate('StaffOrderDetail', { id: i.orderId })} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={styles.iCode}>{i.trackingCode}</Text>
              <Text style={styles.iSub}>{i.statusText} · COD {money(i.cod)} · cước {money(i.fee)}{i.surcharge ? ` · PP ${money(i.surcharge)}` : ''}{i.returnFee ? ` · hoàn ${money(i.returnFee)}` : ''}</Text>
            </View>
            <Text style={[styles.iAmt, { color: i.net >= 0 ? colors.text : colors.danger }]}>{money(i.net)}</Text>
          </Pressable>
        )}
      />
      {a.length ? (
        <BottomBar>
          {a.includes('confirm') ? <Button title="Xác nhận đối soát" icon="checkmark-circle" variant="success" loading={busy === 'confirm'} onPress={confirm} /> : null}
          {a.includes('pay') ? <Button title={`${payToShop ? 'Chi trả shop' : 'Thu từ shop'} ${money(Math.abs(s.net))}`} icon="cash" loading={busy === 'pay'} onPress={() => setPayOpen(true)} /> : null}
          {a.includes('cancel') ? <Button title="Hủy bảng đối soát" icon="close-circle-outline" variant="danger" size="md" loading={busy === 'cancel'} onPress={cancel} /> : null}
        </BottomBar>
      ) : null}

      <Sheet visible={payOpen} title="Lập phiếu thanh toán" onClose={() => setPayOpen(false)}
        footer={<Button title={`Lập phiếu ${money(Math.abs(s.net))}`} icon="checkmark" onPress={pay} style={{ marginTop: 8 }} />}>
        <Card style={{ marginBottom: 14 }}>
          <Text style={styles.payLbl}>{payToShop ? 'Số tiền chi trả cho shop' : 'Số tiền thu từ shop'}</Text>
          <Text style={styles.payAmt}>{money(Math.abs(s.net))}</Text>
          <Text style={styles.payNote}>Số tiền theo bảng đối soát, không sửa được.</Text>
        </Card>
        <Text style={styles.label}>Hình thức</Text>
        <Segmented value={method} onChange={setMethod} items={[{ key: 'BankTransfer', label: 'Chuyển khoản' }, { key: 'Cash', label: 'Tiền mặt' }]} />
        <View style={{ height: 14 }} />
        {method === 'BankTransfer' ? <Field label="Mã giao dịch ngân hàng" icon="barcode-outline" value={bankRef} onChangeText={setBankRef} placeholder="VD: FT2410091234" autoCapitalize="characters" /> : null}
        <Field label="Ghi chú" icon="document-text-outline" value={note} onChangeText={setNote} placeholder="Tùy chọn" />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  shop: { color: 'rgba(255,255,255,0.85)', fontSize: 14.5, fontWeight: '700', flex: 1, marginRight: 8 },
  netLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 12 },
  net: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  period: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, marginTop: 4 },
  pay: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  iCode: { fontSize: 14, fontWeight: '700', color: colors.text },
  iSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  iAmt: { fontSize: 14, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 },
  payLbl: { fontSize: 13, color: colors.muted },
  payAmt: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2 },
  payNote: { fontSize: 11.5, color: colors.faint, marginTop: 3 },
});
