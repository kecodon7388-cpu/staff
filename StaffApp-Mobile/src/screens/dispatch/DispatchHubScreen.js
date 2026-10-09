import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../auth';
import { colors } from '../../theme';
import { ErrorBox, NavyHeader, SectionTitle, Stat, Tile } from '../../components/ui';

export default function DispatchHubScreen({ navigation, route }) {
  const { me, refreshMe } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => { try { await refreshMe(); setError(''); } catch (e) { setError(e.message); } }, [refreshMe]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const d = me?.stats?.dispatch;
  const go = (s, p) => () => navigation.navigate(s, p);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <NavyHeader title="Điều phối" sub="Phân công lấy · giao hàng" back={route.name.endsWith('Hub')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {error ? <ErrorBox text={error} onRetry={load} style={{ marginBottom: 12 }} /> : null}
        <View style={styles.grid}>
          <Stat icon="cube-outline" color={colors.info} bg={colors.infoBg} label="Chờ lấy hàng" value={d?.pickup} alert={d?.pickup > 0} onPress={go('DispatchQueue', { tab: 'pickup' })} />
          <Stat icon="bicycle-outline" label="Chờ giao hàng" value={d?.delivery} alert={d?.delivery > 0} onPress={go('DispatchQueue', { tab: 'delivery' })} />
          <Stat icon="radio-outline" color={colors.success} bg={colors.successBg} label="Shipper online (30')" value={d?.activeShippers} onPress={go('DispatchShippers')} />
          <Stat icon="navigate-outline" color={colors.violet} bg={colors.violetBg} label="Đơn đang giao" value={d?.delivering} onPress={go('DispatchShippers')} />
        </View>
        <SectionTitle title="Chức năng" />
        <View style={styles.grid}>
          <Tile icon="cube-outline" label="Hàng chờ lấy" sub="Phân công lấy hàng" color={colors.info} bg={colors.infoBg} onPress={go('DispatchQueue', { tab: 'pickup' })} />
          <Tile icon="bicycle-outline" label="Hàng chờ giao" sub="Phân công giao" onPress={go('DispatchQueue', { tab: 'delivery' })} />
          <Tile icon="people-outline" label="Shipper" sub="Tải việc · vị trí" color={colors.violet} bg={colors.violetBg} onPress={go('DispatchShippers')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
