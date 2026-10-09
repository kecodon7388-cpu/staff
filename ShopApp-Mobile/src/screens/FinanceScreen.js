import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { codColor, colors, font, genericColor } from '../theme';
import { date, dt, money, signedMoney } from '../format';
import { Card, Empty, ErrorBanner, Loading, NavyHeader, Segmented, SectionTitle, StatusBadge } from '../components/ui';
import OrderCard from '../components/OrderCard';

const SEGS = [{ key: 'cod', label: 'COD' }, { key: 'settle', label: 'Đối soát' }, { key: 'debt', label: 'Công nợ' }];

export default function FinanceScreen({ navigation, route }) {
  const focused = useIsFocused();
  const [seg, setSeg] = useState(route.params?.seg || 'cod');
  useEffect(() => { if (route.params?.seg) setSeg(route.params.seg); }, [route.params?.seg, route.params?.ts]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {focused ? <StatusBar style="light" /> : null}
      <NavyHeader subtitle="Tiền thu hộ · Đối soát · Công nợ" title="Tài chính" />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Segmented items={SEGS} value={seg} onChange={setSeg} />
      </View>
      {seg === 'cod' ? <CodTab navigation={navigation} /> : null}
      {seg === 'settle' ? <SettleTab navigation={navigation} /> : null}
      {seg === 'debt' ? <DebtTab /> : null}
    </View>
  );
}

// ======================= COD =======================
function CodTab({ navigation }) {
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const first = useRef(true);

  const load = useCallback(async (mode = 'load', pg = 1) => {
    const my = ++seq.current;
    if (mode === 'refresh') setRefreshing(true); else if (mode === 'more') setMore(true); else if (mode === 'load') setLoading(true);
    try {
      const r = await api.cod({ status: status || undefined, page: pg });
      if (my !== seq.current) return;
      setSummary(r.summary || []);
      setTotal(r.total || 0);
      setHasMore(!!r.hasMore);
      setPage(pg);
      setItems((prev) => (pg === 1 ? r.items || [] : [...prev, ...(r.items || []).filter((x) => !prev.some((p) => p.id === x.id))]));
      setError('');
    } catch (e) { if (my === seq.current) setError(e.message); } finally {
      if (my === seq.current) { setLoading(false); setRefreshing(false); setMore(false); }
    }
  }, [status]);

  useEffect(() => { load('load', 1); }, [load]);
  useFocusEffect(useCallback(() => { if (first.current) { first.current = false; return; } load('silent', 1); }, [load]));

  const header = (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
        {summary.map((s) => {
          const c = codColor(s.status);
          const active = status === s.status;
          return (
            <Pressable key={s.status} onPress={() => setStatus(active ? '' : s.status)}
              style={[styles.sumCard, active && { borderColor: c.fg, backgroundColor: c.bg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.sumDot, { backgroundColor: c.fg }]} />
                <Text style={styles.sumLabel} numberOfLines={1}>{s.statusText}</Text>
              </View>
              <Text style={styles.sumAmount}>{money(s.amount)}</Text>
              <Text style={styles.sumCount}>{s.count} đơn</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={[font.small, { marginTop: 4, marginBottom: 8 }]}>
        {status ? `Đang lọc: ${summary.find((s) => s.status === status)?.statusText || status} · ` : ''}{total} đơn có thu hộ
      </Text>
      <ErrorBanner message={error} onRetry={() => load('load', 1)} style={{ marginBottom: 10 }} />
    </View>
  );

  if (loading && !items.length && !summary.length) return <Loading />;
  return (
    <FlatList
      data={items}
      keyExtractor={(o) => String(o.id)}
      ListHeaderComponent={header}
      renderItem={({ item }) => <OrderCard o={item} showCodStatus onPress={() => navigation.navigate('OrderDetail', { id: item.id })} />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh', 1)} tintColor={colors.brand} colors={[colors.brand]} />}
      onEndReached={() => { if (hasMore && !more && !loading) load('more', page + 1); }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={more ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} /> : null}
      ListEmptyComponent={loading ? <Loading /> : <Empty icon="cash-outline" title="Chưa có đơn thu hộ" text="Các đơn có tiền COD sẽ hiển thị tại đây." />}
    />
  );
}

// ======================= ĐỐI SOÁT =======================
function SettleTab({ navigation }) {
  const { data, loading, refreshing, error, reload, refresh } = useLoad(() => api.settlements(), [], { refetchOnFocus: true });
  if (loading && !data) return <Loading />;
  const items = data?.items || [];
  const pending = data?.pending || {};
  const bal = data?.balance || 0;
  return (
    <FlatList
      data={items}
      keyExtractor={(s) => String(s.id)}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
      ListHeaderComponent={(
        <View>
          <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 10 }} />
          <Card style={styles.pendCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="hourglass-outline" size={18} color={colors.brand600} />
              <Text style={[font.h3, { flex: 1 }]}>Chờ lên phiên đối soát</Text>
              <Text style={styles.pendCount}>{pending.count || 0} đơn</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
              <View style={styles.pendBox}>
                <Text style={font.small}>COD đã giao</Text>
                <Text style={[styles.pendVal, { color: colors.success }]}>{money(pending.cod)}</Text>
              </View>
              <View style={styles.pendBox}>
                <Text style={font.small}>Cước phải trừ</Text>
                <Text style={[styles.pendVal, { color: colors.danger }]}>{money(pending.fee)}</Text>
              </View>
            </View>
            <View style={styles.pendNet}>
              <Text style={font.small}>Ước tính shop nhận</Text>
              <Text style={styles.pendNetVal}>{money((pending.cod || 0) - (pending.fee || 0))}</Text>
            </View>
          </Card>
          <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="wallet-outline" size={20} color={bal >= 0 ? colors.success : colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>Số dư công nợ</Text>
              <Text style={font.small}>{bal >= 0 ? 'Công ty đang nợ shop' : 'Shop đang nợ công ty'}</Text>
            </View>
            <Text style={[styles.balance, { color: bal >= 0 ? colors.success : colors.danger }]}>{money(bal)}</Text>
          </Card>
          <SectionTitle title="Phiên đối soát" />
        </View>
      )}
      renderItem={({ item: s }) => (
        <Card onPress={() => navigation.navigate('Settlement', { id: s.id })} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[font.h3, { flex: 1 }]}>{s.code}</Text>
            <StatusBadge status={s.status} text={s.statusText} colorFn={genericColor} />
          </View>
          <Text style={[font.small, { marginTop: 3 }]}>Kỳ {date(s.from)} – {date(s.to)} · {s.count} đơn</Text>
          <View style={styles.settleRow}>
            <Mini label="COD" v={s.totalCod} />
            <Mini label="Cước + phụ phí" v={(s.totalFee || 0) + (s.totalSurcharge || 0) + (s.totalReturnFee || 0)} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.miniLabel}>Thực nhận</Text>
              <Text style={[styles.miniVal, { color: colors.brand600, fontSize: 16 }]}>{money(s.net)}</Text>
            </View>
          </View>
          {s.status === 'Draft' ? <Text style={styles.needConfirm}>Chờ shop xác nhận</Text> : null}
        </Card>
      )}
      ListEmptyComponent={<Empty icon="document-text-outline" title="Chưa có phiên đối soát" text="Kế toán sẽ lập phiên đối soát theo chu kỳ của shop." />}
    />
  );
}

const Mini = ({ label, v }) => (
  <View>
    <Text style={styles.miniLabel}>{label}</Text>
    <Text style={styles.miniVal}>{money(v)}</Text>
  </View>
);

// ======================= CÔNG NỢ =======================
function DebtTab() {
  const { data, loading, refreshing, error, reload, refresh } = useLoad(() => api.debts(), [], { refetchOnFocus: true });
  const [view, setView] = useState('ledger');
  if (loading && !data) return <Loading />;
  const bal = data?.balance || 0;
  const list = view === 'ledger' ? data?.items || [] : data?.payments || [];
  return (
    <FlatList
      data={list}
      keyExtractor={(x, i) => String(x.id || x.code || i)}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
      ListHeaderComponent={(
        <View>
          <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 10 }} />
          <View style={[styles.balCard, { backgroundColor: bal >= 0 ? colors.brand600 : colors.danger }]}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Số dư công nợ hiện tại</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{money(bal)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 6 }}>
              {bal > 0 ? 'Công ty đang nợ shop – sẽ thanh toán theo chu kỳ đối soát.' : bal < 0 ? 'Shop đang nợ công ty (cước, phí hoàn...).' : 'Không phát sinh công nợ.'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 4 }}>Quy ước: dương = công ty nợ shop · âm = shop nợ công ty</Text>
          </View>
          <View style={{ marginTop: 12, marginBottom: 6 }}>
            <Segmented items={[{ key: 'ledger', label: 'Sổ công nợ', count: (data?.items || []).length }, { key: 'pay', label: 'Thanh toán', count: (data?.payments || []).length }]}
              value={view} onChange={setView} />
          </View>
        </View>
      )}
      renderItem={({ item }) => (view === 'ledger' ? (
        <Card style={{ marginBottom: 8, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>{item.typeText}{item.refCode ? ' · ' + item.refCode : ''}</Text>
              {item.note ? <Text style={[font.small, { marginTop: 2 }]} numberOfLines={3}>{item.note}</Text> : null}
              <Text style={[font.tiny, { marginTop: 4 }]}>{dt(item.createdAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: item.amount >= 0 ? colors.success : colors.danger }}>{signedMoney(item.amount)}</Text>
              <Text style={[font.tiny, { marginTop: 3 }]}>Số dư: {money(item.balance)}</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={{ marginBottom: 8, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={/^Chi/i.test(item.directionText || '') ? 'arrow-down-circle' : 'arrow-up-circle'} size={24}
              color={/^Chi/i.test(item.directionText || '') ? colors.success : colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>{item.directionText}</Text>
              <Text style={font.small}>{item.code} · {item.methodText}{item.bankRef ? ' · ' + item.bankRef : ''}</Text>
              <Text style={[font.tiny, { marginTop: 2 }]}>{dt(item.paidAt)}</Text>
            </View>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: colors.text }}>{money(item.amount)}</Text>
          </View>
        </Card>
      ))}
      ListEmptyComponent={<Empty icon={view === 'ledger' ? 'book-outline' : 'card-outline'} title={view === 'ledger' ? 'Chưa có bút toán công nợ' : 'Chưa có thanh toán'} />}
    />
  );
}

const styles = StyleSheet.create({
  sumCard: { width: 150, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  sumDot: { width: 8, height: 8, borderRadius: 4 },
  sumLabel: { fontSize: 12.5, color: colors.text2, fontWeight: '600', flexShrink: 1 },
  sumAmount: { fontSize: 15.5, fontWeight: '800', color: colors.text, marginTop: 6 },
  sumCount: { fontSize: 12, color: colors.muted, marginTop: 1 },
  pendCard: { borderColor: colors.brand100 },
  pendCount: { fontSize: 13, fontWeight: '700', color: colors.brand600 },
  pendBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10 },
  pendVal: { fontSize: 15.5, fontWeight: '800', marginTop: 3 },
  pendNet: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  pendNetVal: { fontSize: 18, fontWeight: '800', color: colors.brand600 },
  balance: { fontSize: 16, fontWeight: '800' },
  settleRow: { flexDirection: 'row', gap: 18, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6', alignItems: 'flex-end' },
  miniLabel: { fontSize: 11, color: colors.faint, fontWeight: '600', textTransform: 'uppercase' },
  miniVal: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 1 },
  needConfirm: { marginTop: 10, color: colors.warning, fontWeight: '700', fontSize: 13 },
  balCard: { borderRadius: 18, padding: 18 },
});
