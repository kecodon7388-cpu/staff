import React, { useLayoutEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { colors, font, genericColor } from '../theme';
import { date, dt, money } from '../format';
import { Button, Card, Empty, ErrorBanner, Loading, Notice, SectionTitle, StatusBadge, hapticError, hapticSuccess } from '../components/ui';

export default function SettlementScreen({ navigation, route }) {
  const id = route.params?.id;
  const insets = useSafeAreaInsets();
  const { data: res, loading, refreshing, error, reload, refresh, silent } = useLoad(() => api.settlement(id), [id]);
  const [busy, setBusy] = useState(false);
  const d = res?.data;
  const s = d?.settlement;

  useLayoutEffect(() => { if (s?.code) navigation.setOptions({ title: s.code }); }, [navigation, s?.code]);

  const confirm = () => Alert.alert(
    'Xác nhận đối soát',
    `Shop đồng ý với số liệu phiên ${s.code}: thực nhận ${money(s.net)}?\nSau khi xác nhận, công ty sẽ thanh toán vào tài khoản ngân hàng đã đăng ký.`,
    [
      { text: 'Kiểm tra lại', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          setBusy(true);
          try {
            const r = await api.confirmSettlement(id);
            hapticSuccess();
            Alert.alert('Đã xác nhận', r.message || 'Đã xác nhận đối soát');
            silent();
          } catch (e) { hapticError(); Alert.alert('Không xác nhận được', e.message); } finally { setBusy(false); }
        },
      },
    ],
  );

  if (loading && !d) return <Loading />;
  if (!d) return <View style={{ padding: 16 }}><ErrorBanner message={error || 'Không tải được phiên đối soát'} onRetry={reload} /></View>;

  const deduct = (s.totalFee || 0) + (s.totalSurcharge || 0) + (s.totalReturnFee || 0);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={d.items || []}
        keyExtractor={(it, i) => String(it.orderId || i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={(
          <View>
            <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 10 }} />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[font.h2, { flex: 1 }]}>{s.code}</Text>
                <StatusBadge status={s.status} text={s.statusText} colorFn={genericColor} />
              </View>
              <Text style={[font.small, { marginTop: 4 }]}>Kỳ đối soát {date(s.from)} – {date(s.to)} · {s.count} đơn</Text>
              <View style={styles.totals}>
                <Line label="Tổng tiền thu hộ (COD)" v={s.totalCod} color={colors.success} sign="+" />
                <Line label="Cước vận chuyển" v={s.totalFee} color={colors.danger} sign="−" />
                <Line label="Phụ phí" v={s.totalSurcharge} color={colors.danger} sign="−" />
                <Line label="Phí hoàn hàng" v={s.totalReturnFee} color={colors.danger} sign="−" />
              </View>
              <View style={styles.net}>
                <View>
                  <Text style={font.small}>Shop thực nhận</Text>
                  <Text style={font.tiny}>COD − {money(deduct)} phí</Text>
                </View>
                <Text style={styles.netVal}>{money(s.net)}</Text>
              </View>
              <View style={{ marginTop: 10, gap: 2 }}>
                <Text style={font.tiny}>Lập lúc {dt(s.createdAt)}</Text>
                {s.confirmedAt ? <Text style={font.tiny}>Xác nhận lúc {dt(s.confirmedAt)}</Text> : null}
                {s.paidAt ? <Text style={font.tiny}>Thanh toán lúc {dt(s.paidAt)}</Text> : null}
              </View>
            </Card>

            {d.canConfirm ? (
              <Notice tone="warning" icon="alert-circle" style={{ marginTop: 12 }}
                text="Vui lòng kiểm tra danh sách đơn bên dưới và xác nhận để công ty tiến hành thanh toán." />
            ) : null}

            {(d.payments || []).length ? (
              <>
                <SectionTitle title="Thanh toán" />
                {d.payments.map((p, i) => (
                  <Card key={p.code || i} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
                    <Ionicons name="card" size={22} color={colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={font.h3}>{p.directionText}</Text>
                      <Text style={font.small}>{p.code} · {p.methodText}{p.bankRef ? ' · ' + p.bankRef : ''}</Text>
                      <Text style={font.tiny}>{dt(p.paidAt)}</Text>
                    </View>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>{money(p.amount)}</Text>
                  </Card>
                ))}
              </>
            ) : null}

            <SectionTitle title={`Đơn trong phiên (${(d.items || []).length})`} />
          </View>
        )}
        renderItem={({ item }) => (
          <Card onPress={item.orderId ? () => navigation.navigate('OrderDetail', { id: item.orderId }) : undefined} style={{ marginBottom: 8, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[font.h3, { flex: 1 }]}>{item.trackingCode}</Text>
              <Text style={{ fontSize: 12.5, color: colors.muted }}>{item.statusText}</Text>
            </View>
            {item.referenceCode ? <Text style={font.tiny}>Mã shop: {item.referenceCode}</Text> : null}
            <View style={styles.itemRow}>
              <Small label="COD" v={item.cod} />
              <Small label="Cước" v={item.fee} />
              {item.surcharge ? <Small label="Phụ phí" v={item.surcharge} /> : null}
              {item.returnFee ? <Small label="Phí hoàn" v={item.returnFee} /> : null}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.smallLabel}>Thực nhận</Text>
                <Text style={[styles.smallVal, { color: (item.net || 0) >= 0 ? colors.brand600 : colors.danger }]}>{money(item.net)}</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Empty title="Phiên chưa có đơn" />}
      />
      {d.canConfirm ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
          <Button title="Xác nhận đối soát" icon="checkmark-done" onPress={confirm} loading={busy} />
        </View>
      ) : null}
    </View>
  );
}

const Line = ({ label, v, color, sign }) => (
  <View style={styles.line}>
    <Text style={styles.lineLabel}>{label}</Text>
    <Text style={[styles.lineVal, { color: v ? color : colors.faint }]}>{v ? sign + ' ' : ''}{money(v)}</Text>
  </View>
);

const Small = ({ label, v }) => (
  <View>
    <Text style={styles.smallLabel}>{label}</Text>
    <Text style={styles.smallVal}>{money(v)}</Text>
  </View>
);

const styles = StyleSheet.create({
  totals: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lineLabel: { fontSize: 14, color: colors.text2 },
  lineVal: { fontSize: 14, fontWeight: '700' },
  net: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: colors.brand50 },
  netVal: { fontSize: 22, fontWeight: '800', color: colors.brand600 },
  itemRow: { flexDirection: 'row', gap: 14, marginTop: 8, alignItems: 'flex-end' },
  smallLabel: { fontSize: 10.5, color: colors.faint, fontWeight: '600', textTransform: 'uppercase' },
  smallVal: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 1 },
  bar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
