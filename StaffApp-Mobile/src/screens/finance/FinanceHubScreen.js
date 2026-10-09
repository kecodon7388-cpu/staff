import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { caseColor, colors, radius } from '../../theme';
import { money, moneyShort, num } from '../../format';
import { Card, ErrorBox, HBar, NavyHeader, SectionTitle, Stat, Tile } from '../../components/ui';

export default function FinanceHubScreen({ navigation, route }) {
  const { can } = useAuth();
  const fn = useCallback(() => staff.finSummary(), []);
  const { data: d, error, refreshing, refresh, reload } = useLoad(fn);
  const manage = can('cod.manage');
  const go = (s, p) => () => navigation.navigate(s, p);
  const maxCod = Math.max(1, ...(d?.cod || []).map((x) => x.cod || 0));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavyHeader title="Tài chính" sub={manage ? 'COD · phiếu nộp · đối soát shop' : 'Xem COD & đối soát (chỉ xem)'} back={route.name.endsWith('Hub')} onBack={() => navigation.goBack()}>
        <View style={styles.hero}>
          <Text style={styles.heroLbl}>COD shipper đang giữ</Text>
          <Text style={styles.heroVal}>{d ? money(d.heldByShippers) : '…'}</Text>
          {d ? <Text style={styles.heroSub}>Ngưỡng cảnh báo mỗi shipper: {money(d.codAlertAmount)}</Text> : null}
        </View>
      </NavyHeader>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {error ? <ErrorBox text={error} onRetry={reload} style={{ marginBottom: 12 }} /> : null}
        <View style={styles.grid}>
          <Stat icon="document-text-outline" color={colors.warning} bg={colors.warningBg} label={`Phiếu nộp nháp · ${moneyShort(d?.draftRemittanceAmount)}`} value={d?.draftRemittances}
            onPress={manage ? go('FinRemittances', { status: 'Draft' }) : undefined} />
          <Stat icon="create-outline" color={colors.info} bg={colors.infoBg} label="Đối soát nháp" value={d?.draftSettlements} onPress={go('FinSettlements', { status: 'Draft' })} />
          <Stat icon="hourglass-outline" color={colors.violet} bg={colors.violetBg} label="Đối soát chờ trả" value={d?.confirmedSettlements} onPress={go('FinSettlements', { status: 'Confirmed' })} />
          <Stat icon="cash-outline" color={colors.success} bg={colors.successBg} label="Phải trả shop (đã xác nhận)" value={moneyShort(d?.toPayShops)} onPress={go('FinSettlements', { status: 'Confirmed' })} />
          <Stat icon="arrow-up-circle-outline" color={colors.danger} bg={colors.dangerBg} label="Công nợ phải trả shop" value={moneyShort(d?.weOweShops)} />
          <Stat icon="arrow-down-circle-outline" color={colors.brand} bg={colors.brand100} label="Shop còn nợ công ty" value={moneyShort(d?.shopsOweUs)} />
        </View>

        <SectionTitle title="Chức năng" />
        <View style={styles.grid}>
          {manage ? <Tile icon="people-outline" label="Shipper giữ COD" sub="Lập phiếu nộp" color={colors.warning} bg={colors.warningBg} onPress={go('FinHolders')} /> : null}
          {manage ? <Tile icon="receipt-outline" label="Phiếu nộp tiền" sub="Xác nhận / hủy" color={colors.info} bg={colors.infoBg} onPress={go('FinRemittances')} /> : null}
          <Tile icon="git-compare-outline" label="Đối soát shop" sub="Lập · xác nhận · trả" color={colors.success} bg={colors.successBg} onPress={go('FinSettlements')} />
        </View>

        {d?.cod?.length ? (
          <>
            <SectionTitle title="COD theo trạng thái" />
            <Card>
              {d.cod.map((x) => {
                const c = caseColor(x.status);
                return <HBar key={x.status} label={`${x.statusText} · ${num(x.count)} đơn`} value={x.cod} max={maxCod} color={c.fg} right={money(x.cod)} />;
              })}
              <Text style={styles.note}>Giá trị COD trên đơn (không tính đơn đã hủy).</Text>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hero: { marginTop: 16, padding: 14, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroLbl: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  heroVal: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  note: { fontSize: 11.5, color: colors.faint },
});
