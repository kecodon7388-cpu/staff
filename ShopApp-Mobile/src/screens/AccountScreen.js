import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { api } from '../api';
import { useAuth } from '../auth';
import { getServer } from '../storage';
import { colors, font } from '../theme';
import { initials, money } from '../format';
import { Badge, Button, Card, NavyHeader, Row, SectionTitle, call } from '../components/ui';

export default function AccountScreen({ navigation }) {
  const focused = useIsFocused();
  const { profile, signOut, updateProfile } = useAuth();
  const [company, setCompany] = useState(null);
  const [server, setServerUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await api.me();
      if (me?.profile) updateProfile(me.profile);
      setCompany(me?.company || null);
    } catch { /* dùng hồ sơ đã lưu */ }
  }, [updateProfile]);

  useEffect(() => { getServer().then(setServerUrl); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const logout = () => Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi CE Shop trên thiết bị này?', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Đăng xuất', style: 'destructive', onPress: async () => { setLeaving(true); await signOut(); } },
  ]);

  const p = profile || {};
  const shop = p.shop || {};
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={[colors.brand]} />}>
        <NavyHeader subtitle="Tài khoản" title={shop.name || 'Shop'}>
          <View style={styles.user}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(p.fullName || p.username)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{p.fullName || p.username}</Text>
              <Text style={styles.userSub}>@{p.username}{p.roleText ? ' · ' + p.roleText : ''}</Text>
            </View>
            {p.isShopAdmin ? <Badge text="Chủ shop" fg="#fff" bg="rgba(13,148,136,0.55)" /> : null}
          </View>
        </NavyHeader>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle title="Thông tin shop" />
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            <Row icon="storefront-outline" label="Mã shop" value={shop.code} />
            <Row icon="person-outline" label="Người liên hệ" value={shop.contactName || '—'} />
            <Row icon="call-outline" label="Điện thoại" value={shop.phone || '—'} />
            {shop.email ? <Row icon="mail-outline" label="Email" value={shop.email} /> : null}
            <Row icon="location-outline" label="Địa chỉ" value={[shop.address, shop.province].filter(Boolean).join(', ') || '—'} />
            {shop.taxCode ? <Row icon="document-outline" label="Mã số thuế" value={shop.taxCode} /> : null}
            <Row icon="repeat-outline" label="Chu kỳ đối soát" value={shop.cycleText || '—'} />
            <Row icon="cash-outline" label="Hạn mức COD" value={shop.codLimit ? money(shop.codLimit) : 'Không giới hạn'} last />
          </Card>

          <SectionTitle title="Tài khoản nhận tiền COD" />
          <Card style={styles.bank}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="card" size={22} color="#fff" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', flex: 1 }} numberOfLines={1}>{shop.bankName || 'Chưa khai báo ngân hàng'}</Text>
            </View>
            <Text style={styles.bankAcc}>{shop.bankAccount ? shop.bankAccount.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• ••••'}</Text>
            <Text style={styles.bankName}>{shop.bankAccountName || '—'}</Text>
          </Card>
          {p.isShopAdmin ? (
            <Button title="Đổi tài khoản nhận tiền" icon="swap-horizontal" variant="soft" size="md" style={{ marginTop: 10 }}
              onPress={() => navigation.navigate('Bank')} />
          ) : (
            <Text style={[font.small, { marginTop: 8 }]}>Chỉ chủ shop được thay đổi tài khoản nhận tiền.</Text>
          )}

          <SectionTitle title="Tiện ích" />
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            <Row icon="location-outline" label="Địa chỉ lấy hàng" onPress={() => navigation.navigate('Addresses')} />
            <Row icon="chatbubbles-outline" label="Khiếu nại" onPress={() => navigation.navigate('Complaints')} />
            <Row icon="return-down-back-outline" label="Hàng hoàn" onPress={() => navigation.navigate('Returns')} />
            <Row icon="notifications-outline" label="Thông báo" onPress={() => navigation.navigate('Notifications')} />
            <Row icon="key-outline" label="Đổi mật khẩu" onPress={() => navigation.navigate('ChangePassword')} last />
          </Card>

          <SectionTitle title="Hỗ trợ" />
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {company?.phone ? (
              <Row icon="headset-outline" label={'Hotline ' + (company.name || 'CSKH')} value={company.phone} valueStyle={{ color: colors.brand600 }}
                onPress={() => call(company.phone)} />
            ) : null}
            {company?.email ? <Row icon="mail-outline" label="Email hỗ trợ" value={company.email} /> : null}
            <Row icon="server-outline" label="Máy chủ" value={server} />
            <Row icon="information-circle-outline" label="Phiên bản" value={'CE Shop ' + version} last />
          </Card>

          <Button title="Đăng xuất" icon="log-out-outline" variant="danger" onPress={logout} loading={leaving} style={{ marginTop: 24 }} />
          <Pressable onPress={() => company?.phone && call(company.phone)}>
            <Text style={styles.foot}>© Courier Express · Tạo đơn · Theo dõi · Đối soát COD</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  userName: { color: '#fff', fontSize: 16.5, fontWeight: '700' },
  userSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  bank: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  bankAcc: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  bankName: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  foot: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: 18 },
});
