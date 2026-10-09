import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { ErrorBox, NavyHeader, SectionTitle, Stat, Tile } from '../../components/ui';

export default function CasesHubScreen({ navigation, route }) {
  const { me, refreshMe, has, canAny } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { await refreshMe(); setError(''); } catch (e) { setError(e.message); } }, [refreshMe]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const c = me?.stats?.complaints;
  const r = me?.stats?.returns;
  const go = (s, p) => () => navigation.navigate(s, p);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavyHeader title="CSKH" sub="Khiếu nại · bồi thường · hàng hoàn" back={route.name.endsWith('Hub')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {error ? <ErrorBox text={error} onRetry={load} style={{ marginBottom: 12 }} /> : null}
        {has('complaints') ? (
          <>
            <SectionTitle title="Khiếu nại" style={{ marginTop: 4 }} />
            <View style={styles.grid}>
              <Stat icon="folder-open-outline" label="Đang mở" value={c?.open} onPress={go('Complaints', { scope: 'open' })} />
              <Stat icon="sparkles-outline" color={colors.violet} bg={colors.violetBg} label="Mới tiếp nhận" value={c?.isNew} alert={c?.isNew > 0} onPress={go('Complaints', { status: 'New' })} />
              <Stat icon="person-outline" color={colors.info} bg={colors.infoBg} label="Giao cho tôi" value={c?.mine} onPress={go('Complaints', { scope: 'mine' })} />
              <Stat icon="hourglass-outline" color={colors.warning} bg={colors.warningBg} label="Chờ phê duyệt" value={c?.waitingApproval} onPress={go('Complaints', { status: 'WaitingApproval' })} />
            </View>
          </>
        ) : null}
        {has('returns') ? (
          <>
            <SectionTitle title="Hàng hoàn" />
            <View style={styles.grid}>
              <Stat icon="time-outline" color={colors.warning} bg={colors.warningBg} label="Chờ hoàn" value={r?.pending} onPress={go('Returns', { status: 'Pending' })} />
              <Stat icon="return-down-back-outline" label="Đang hoàn" value={r?.returning} onPress={go('Returns', { status: 'Returning' })} />
              <Stat icon="business-outline" color={colors.info} bg={colors.infoBg} label="Tại kho hoàn" value={r?.atWarehouse} onPress={go('Returns', { status: 'AtReturnWarehouse' })} />
            </View>
          </>
        ) : null}
        <SectionTitle title="Chức năng" />
        <View style={styles.grid}>
          {has('complaints') ? <Tile icon="chatbubbles-outline" label="Khiếu nại" sub="Danh sách · xử lý" color={colors.warning} bg={colors.warningBg} onPress={go('Complaints')} /> : null}
          {canAny('complaints.create', 'complaints.manage') ? <Tile icon="add-circle-outline" label="Tạo khiếu nại" sub="Quét mã đơn" onPress={go('ComplaintCreate')} /> : null}
          {has('returns') ? <Tile icon="return-down-back-outline" label="Hàng hoàn" sub="Cập nhật trạng thái" color={colors.info} bg={colors.infoBg} onPress={go('Returns')} /> : null}
          <Tile icon="search-outline" label="Tra cứu đơn" sub="Mã / SĐT" color={colors.navy} bg="#E2E8F0" onPress={go('OrderLookup')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
