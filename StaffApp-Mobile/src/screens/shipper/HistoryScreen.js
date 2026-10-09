import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { shipper } from '../../api';
import { colors, radius, taskTypeMeta } from '../../theme';
import { addDays, dt, isoDay, money, weekday } from '../../format';
import { Empty, Loading } from '../../components/ui';

export default function HistoryScreen({ navigation }) {
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const day = addDays(-offset);

  const load = useCallback(async (off) => {
    setItems(null);
    try { const r = await shipper.history(isoDay(addDays(-off))); setItems(r.items || []); } catch { setItems([]); }
  }, []);
  useFocusEffect(useCallback(() => { load(offset); }, [load, offset]));

  const ok = (items || []).filter((i) => i.result === 'Completed').length;
  const total = (items || []).reduce((s, i) => s + (i.type === 'delivery' && i.result === 'Completed' ? i.collected : 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={{ padding: 12, gap: 8 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const d = addDays(-i);
          const on = i === offset;
          return (
            <Pressable key={i} onPress={() => setOffset(i)} style={[styles.day, on && styles.dayOn]}>
              <Text style={[styles.dayTop, on && { color: '#fff' }]}>{i === 0 ? 'Hôm nay' : weekday(d)}</Text>
              <Text style={[styles.dayNum, on && { color: '#fff' }]}>{d.getDate()}/{d.getMonth() + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {items == null ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(i, idx) => `${i.orderId}-${idx}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(offset); setRefreshing(false); }} />}
          ListHeaderComponent={items.length ? <Text style={styles.sum}>{items.length} việc · {ok} hoàn thành · đã thu {money(total)}</Text> : null}
          renderItem={({ item }) => {
            const m = taskTypeMeta[item.type] || taskTypeMeta.delivery;
            const good = item.result === 'Completed';
            return (
              <Pressable onPress={() => navigation.navigate('Order', { id: item.orderId })} style={styles.item}>
                <View style={[styles.icon, { backgroundColor: m.bg }]}><Ionicons name={m.icon} size={18} color={m.color} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{item.trackingCode}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{m.label} · {item.receiver} · {dt(item.time)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.res, { color: good ? colors.success : colors.danger }]}>{item.resultText}</Text>
                  {item.type === 'delivery' && good && item.collected > 0 ? <Text style={styles.amt}>{money(item.collected)}</Text> : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Empty icon="calendar-outline" title={`Không có việc ngày ${day.getDate()}/${day.getMonth() + 1}`} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  day: { width: 72, alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: '#F1F5F9' },
  dayOn: { backgroundColor: colors.brand },
  dayTop: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  dayNum: { fontSize: 16, color: colors.text, fontWeight: '800', marginTop: 2 },
  sum: { fontSize: 13, color: colors.muted, marginBottom: 10, fontWeight: '500' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  res: { fontSize: 12.5, fontWeight: '700' },
  amt: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 2 },
});
