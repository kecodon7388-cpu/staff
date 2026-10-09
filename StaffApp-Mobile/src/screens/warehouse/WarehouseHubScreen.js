import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { ErrorBox, NavyHeader, SectionTitle, Stat, Tile } from '../../components/ui';

export default function WarehouseHubScreen({ navigation, route }) {
  const { me, refreshMe, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { await refreshMe(); setError(''); } catch (e) { setError(e.message); } }, [refreshMe]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const w = me?.stats?.warehouse;
  const go = (s, p) => () => navigation.navigate(s, p);
  const isStack = route.name.endsWith('Hub');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavyHeader title="Kho" sub={profile?.branch || 'Nghiệp vụ kho · bưu cục · hub'} back={isStack} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {error ? <ErrorBox text={error} onRetry={load} style={{ marginBottom: 12 }} /> : null}
        <View style={styles.grid}>
          <Stat icon="cube-outline" label="Đang tồn kho" value={w?.inStock} onPress={go('WhInventory')} />
          <Stat icon="alarm-outline" color={colors.danger} bg={colors.dangerBg} label={`Quá ${w?.alertDays ?? '–'} ngày`} value={w?.overdue} alert={w?.overdue > 0} onPress={go('WhInventory', { overdue: true })} />
          <Stat icon="albums-outline" color={colors.info} bg={colors.infoBg} label="Bảng kê đang gom" value={w?.openManifests} onPress={go('WhManifests', { status: 'Open' })} />
          <Stat icon="bus-outline" color={colors.violet} bg={colors.violetBg} label="Chuyến đang đến" value={w?.incoming} onPress={go('WhManifests', { status: 'Dispatched' })} />
        </View>
        <SectionTitle title="Nghiệp vụ" />
        <View style={styles.tiles}>
          <Tile icon="scan" label="Trạm quét" sub="Nhập · phân loại · xuất" onPress={go('WhScan')} />
          <Tile icon="layers-outline" label="Tồn kho" sub="Ngày lưu kho" color={colors.info} bg={colors.infoBg} onPress={go('WhInventory')} />
          <Tile icon="albums-outline" label="Bảng kê" sub="Trung chuyển · bàn giao" color={colors.violet} bg={colors.violetBg} onPress={go('WhManifests')} />
          <Tile icon="checkbox-outline" label="Kiểm kê" sub="So khớp tồn" color={colors.success} bg={colors.successBg} onPress={go('WhStocktake')} />
          <Tile icon="warning-outline" label="Sự cố" sub="Thất lạc · hư hỏng" color={colors.danger} bg={colors.dangerBg} onPress={go('WhIncidents')} />
          <Tile icon="search-outline" label="Tra cứu đơn" sub="Mã / SĐT" color={colors.navy} bg="#E2E8F0" onPress={go('OrderLookup')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
