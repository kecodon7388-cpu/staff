import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLoad } from '../../hooks';
import { colors, radius } from '../../theme';
import { ago, initials, matches, money } from '../../format';
import { ListState, SearchBar, call } from '../../components/ui';

export default function FinHoldersScreen({ navigation }) {
  const { me } = useAuth();
  const [q, setQ] = useState('');
  const fn = useCallback(async () => (await staff.finHolders()).items || [], []);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const alertAmount = me?.stats?.finance?.codAlertAmount;
  const list = useMemo(() => (data ? data.filter((h) => matches(q, h.name, h.code, h.phone)).sort((a, b) => b.amount - a.amount) : null), [data, q]);
  const total = (data || []).reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.top}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Tìm shipper" />
        {data ? <Text style={styles.sum}>{data.length} shipper · tổng {money(total)}{alertAmount ? ` · ngưỡng ${money(alertAmount)}` : ''}</Text> : null}
      </View>
      <FlatList
        data={list || []}
        keyExtractor={(h) => String(h.shipperId)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item: h }) => (
          <Pressable onPress={() => navigation.navigate('FinHolderDetail', { shipperId: h.shipperId, name: h.name })}
            style={[styles.item, h.overLimit && styles.over]}>
            <View style={[styles.avatar, h.overLimit && { backgroundColor: colors.dangerBg }]}>
              <Text style={[styles.avatarText, h.overLimit && { color: colors.danger }]}>{initials(h.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{h.name} <Text style={styles.code}>· {h.code}</Text></Text>
              <Text style={styles.sub}>{h.count} đơn{h.inDraft ? ` · ${h.inDraft} đơn đã lập phiếu` : ''} · giữ từ {ago(h.oldest)}</Text>
              {h.overLimit ? <Text style={styles.warn}><Ionicons name="alert-circle" size={12} /> Vượt ngưỡng giữ tiền</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text style={[styles.amt, h.overLimit && { color: colors.danger }]}>{money(h.amount)}</Text>
              <Pressable onPress={() => call(h.phone)} hitSlop={8}><Ionicons name="call-outline" size={18} color={colors.success} /></Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<ListState loading={loading && !data} error={error} onRetry={reload} icon="wallet-outline" title="Không shipper nào đang giữ COD" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  sum: { fontSize: 12.5, color: colors.muted, marginTop: 8, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  over: { borderColor: '#FECACA', backgroundColor: '#FFFBFB' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.warningBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', color: colors.warning },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  code: { fontSize: 12.5, color: colors.faint },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  warn: { fontSize: 12, color: colors.danger, fontWeight: '700', marginTop: 3 },
  amt: { fontSize: 15.5, fontWeight: '800', color: colors.text },
});
