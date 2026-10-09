import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, taskTypeMeta } from '../theme';
import { money, date } from '../format';
import { ActionChip, StatusBadge, call, navigateTo } from './ui';

export default function TaskCard({ item, onPress }) {
  const meta = taskTypeMeta[item.type] || taskTypeMeta.delivery;
  const due = item.nextDeliveryDate ? new Date(item.nextDeliveryDate) : null;
  const overdue = due && due < new Date(new Date().toDateString());
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.93 : 1 }]}>
      <View style={[styles.stripe, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1, padding: 14, paddingLeft: 16 }}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{item.trackingCode}</Text>
            {item.referenceCode ? <Text style={styles.ref}>Mã shop: {item.referenceCode}</Text> : null}
          </View>
          <StatusBadge status={item.status} text={item.statusText} />
        </View>

        <View style={styles.line}>
          <Ionicons name="person-outline" size={15} color={colors.muted} />
          <Text style={styles.name} numberOfLines={1}>{item.contactName}</Text>
          <Text style={styles.phone}>{item.contactPhone}</Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="location-outline" size={15} color={colors.muted} />
          <Text style={styles.addr} numberOfLines={2}>{item.address}</Text>
        </View>
        <View style={styles.line}>
          <Ionicons name="cube-outline" size={15} color={colors.muted} />
          <Text style={styles.item} numberOfLines={1}>{item.itemName} · {item.weight} kg{item.isFragile ? ' · Dễ vỡ' : ''}</Text>
        </View>

        {item.failedAttempts > 0 ? (
          <View style={styles.warn}>
            <Ionicons name="alert-circle" size={14} color={colors.warning} />
            <Text style={styles.warnText} numberOfLines={1}>
              Giao lại lần {item.failedAttempts + 1}{due ? ` · hẹn ${date(item.nextDeliveryDate)}` : ''}{item.lastFailReason ? ` · ${item.lastFailReason}` : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.bottom}>
          {item.type === 'delivery' ? (
            <View>
              <Text style={styles.collectLabel}>Thu người nhận</Text>
              <Text style={[styles.collect, item.amountToCollect > 0 ? null : { color: colors.muted }]}>{item.amountToCollect > 0 ? money(item.amountToCollect) : 'Không thu tiền'}</Text>
            </View>
          ) : (
            <View style={[styles.typeTag, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={14} color={meta.color} />
              <Text style={{ color: meta.color, fontWeight: '700', fontSize: 12 }}>{meta.label}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionChip icon="call" label="Gọi" onPress={() => call(item.contactPhone)} color={colors.success} />
            <ActionChip icon="navigate" label="Đường đi" onPress={() => navigateTo(item.address)} />
          </View>
        </View>
        {overdue ? <Text style={styles.overdue}>Quá hạn hẹn giao</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden', ...shadow },
  stripe: { width: 4 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  code: { fontSize: 15.5, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
  ref: { fontSize: 12, color: colors.faint, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  name: { fontSize: 14.5, fontWeight: '600', color: colors.text, flexShrink: 1 },
  phone: { fontSize: 14, color: colors.muted, marginLeft: 'auto' },
  addr: { flex: 1, fontSize: 13.5, color: colors.text2, lineHeight: 19 },
  item: { flex: 1, fontSize: 13, color: colors.muted },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warningBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 },
  warnText: { fontSize: 12, color: '#92400E', flex: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  collectLabel: { fontSize: 11.5, color: colors.faint },
  collect: { fontSize: 16, fontWeight: '800', color: colors.text },
  typeTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  overdue: { marginTop: 8, fontSize: 12, fontWeight: '700', color: colors.danger },
});
