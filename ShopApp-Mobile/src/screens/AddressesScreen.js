import React, { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { colors, font } from '../theme';
import { Badge, Button, Card, Empty, ErrorBanner, Loading, Notice, SectionTitle, call, hapticError, hapticSuccess } from '../components/ui';

const GROUPS = [
  { type: 'Pickup', title: 'Địa chỉ lấy hàng', icon: 'storefront-outline' },
  { type: 'Return', title: 'Địa chỉ trả hàng hoàn', icon: 'return-down-back-outline' },
];

export default function AddressesScreen({ navigation }) {
  const { data, loading, refreshing, error, reload, refresh, silent } = useLoad(() => api.addresses(), [], { refetchOnFocus: true });
  const [busy, setBusy] = useState(null);
  const canEdit = !!data?.canEdit;
  const items = data?.items || [];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (canEdit ? (
        <Pressable onPress={() => navigation.navigate('AddressForm', { type: 'Pickup' })} hitSlop={10}>
          <Ionicons name="add-circle" size={26} color={colors.brand600} />
        </Pressable>
      ) : null),
    });
  }, [navigation, canEdit]);

  const act = async (key, fn) => {
    setBusy(key);
    try { const r = await fn(); hapticSuccess(); if (r?.message) Alert.alert('Thành công', r.message); silent(); }
    catch (e) { hapticError(); Alert.alert('Không thực hiện được', e.message); } finally { setBusy(null); }
  };

  const remove = (a) => Alert.alert('Xóa địa chỉ', `Xóa địa chỉ "${a.label || a.contactName}"?`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => act('del' + a.id, () => api.deleteAddress(a.id)) },
  ]);

  if (loading && !data) return <Loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}>
      <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 10 }} />
      {data && !canEdit ? <Notice icon="lock-closed-outline" text="Chỉ chủ shop (quản trị shop) được thêm / sửa sổ địa chỉ." style={{ marginBottom: 4 }} /> : null}

      {GROUPS.map((g) => {
        const list = items.filter((a) => a.type === g.type);
        return (
          <View key={g.type}>
            <SectionTitle title={g.title} right={canEdit ? (
              <Pressable onPress={() => navigation.navigate('AddressForm', { type: g.type })} hitSlop={8}>
                <Text style={styles.link}>+ Thêm</Text>
              </Pressable>
            ) : null} />
            {!list.length ? (
              <Card><Empty icon={g.icon} title="Chưa có địa chỉ" text={g.type === 'Pickup' ? 'Thêm địa chỉ để bưu cục đến lấy hàng.' : 'Hàng hoàn sẽ trả về địa chỉ lấy hàng mặc định nếu chưa khai báo.'} /></Card>
            ) : list.map((a) => (
              <Card key={a.id} style={[{ marginBottom: 10 }, a.isDefault && { borderColor: colors.brand100 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={g.icon} size={18} color={a.isDefault ? colors.brand600 : colors.muted} />
                  <Text style={[font.h3, { flex: 1 }]} numberOfLines={1}>{a.label || a.contactName}</Text>
                  {a.isDefault ? <Badge text="Mặc định" /> : null}
                </View>
                <Text style={[font.body, { marginTop: 6 }]}>{a.contactName} · {a.phone}</Text>
                <Text style={[font.small, { marginTop: 3, lineHeight: 18 }]}>{a.full}</Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => call(a.phone)} style={styles.act} hitSlop={4}>
                    <Ionicons name="call-outline" size={16} color={colors.brand600} /><Text style={styles.actText}>Gọi</Text>
                  </Pressable>
                  {canEdit ? (
                    <>
                      {!a.isDefault ? (
                        <Pressable onPress={() => act('def' + a.id, () => api.defaultAddress(a.id))} style={styles.act} hitSlop={4} disabled={!!busy}>
                          <Ionicons name="star-outline" size={16} color={colors.brand600} /><Text style={styles.actText}>Đặt mặc định</Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => navigation.navigate('AddressForm', { address: a })} style={styles.act} hitSlop={4}>
                        <Ionicons name="create-outline" size={16} color={colors.brand600} /><Text style={styles.actText}>Sửa</Text>
                      </Pressable>
                      <Pressable onPress={() => remove(a)} style={styles.act} hitSlop={4} disabled={!!busy}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} /><Text style={[styles.actText, { color: colors.danger }]}>Xóa</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        );
      })}

      {canEdit ? <Button title="Thêm địa chỉ lấy hàng" icon="add" variant="soft" style={{ marginTop: 18 }} onPress={() => navigation.navigate('AddressForm', { type: 'Pickup' })} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brand600, fontWeight: '700', fontSize: 13.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  act: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actText: { color: colors.brand600, fontWeight: '600', fontSize: 13.5 },
});
