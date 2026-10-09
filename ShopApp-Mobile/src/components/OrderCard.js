import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, StatusBadge } from './ui';
import { colors } from '../theme';
import { money, shortDt } from '../format';

/** Thẻ đơn hàng dùng cho danh sách (dữ liệu ShopOrderRow) */
export default function OrderCard({ o, onPress, showCodStatus }) {
  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.code} selectable>{o.trackingCode}</Text>
          {o.referenceCode ? <Text style={styles.ref} numberOfLines={1}>Mã shop: {o.referenceCode}</Text> : null}
        </View>
        <StatusBadge status={o.status} text={o.statusText} />
      </View>

      <View style={styles.receiver}>
        <Ionicons name="person-circle-outline" size={18} color={colors.muted} />
        <Text style={styles.name} numberOfLines={1}>{o.receiverName}</Text>
        <Text style={styles.phone}>{o.receiverPhone}</Text>
      </View>
      <View style={styles.receiver}>
        <Ionicons name="location-outline" size={16} color={colors.faint} style={{ marginLeft: 1 }} />
        <Text style={styles.sub} numberOfLines={1}>{[o.province, o.itemName].filter(Boolean).join(' · ') || '—'}</Text>
      </View>

      {o.lastFailReason && (o.status === 'DeliveryFailed' || o.status === 'Rescheduled') ? (
        <View style={styles.fail}>
          <Ionicons name="alert-circle" size={15} color={colors.danger} />
          <Text style={styles.failText} numberOfLines={2}>
            {o.lastFailReason}{o.failedAttempts ? ` (lần ${o.failedAttempts})` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.bottom}>
        <View style={styles.money}>
          <Text style={styles.mLabel}>COD</Text>
          <Text style={[styles.mValue, { color: o.codAmount > 0 ? colors.brand600 : colors.faint }]}>{money(o.codAmount)}</Text>
        </View>
        <View style={styles.money}>
          <Text style={styles.mLabel}>Cước</Text>
          <Text style={styles.mValue}>{money(o.totalFee)}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          {showCodStatus && o.codStatusText ? <Text style={styles.codSt}>{o.codStatusText}</Text> : null}
          <Text style={styles.date}>{shortDt(o.createdAt)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, paddingHorizontal: 14, paddingVertical: 13 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  code: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  ref: { fontSize: 12, color: colors.muted, marginTop: 2 },
  receiver: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  name: { fontSize: 14.5, fontWeight: '600', color: colors.text2, flexShrink: 1 },
  phone: { fontSize: 13.5, color: colors.muted },
  sub: { fontSize: 13, color: colors.muted, flex: 1 },
  fail: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: colors.dangerBg, borderRadius: 9, padding: 8, marginTop: 8 },
  failText: { flex: 1, fontSize: 12.5, color: '#991B1B' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 18, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  money: {},
  mLabel: { fontSize: 11, color: colors.faint, fontWeight: '600', textTransform: 'uppercase' },
  mValue: { fontSize: 14.5, fontWeight: '700', color: colors.text, marginTop: 1 },
  codSt: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  date: { fontSize: 12, color: colors.faint, marginTop: 2 },
});
