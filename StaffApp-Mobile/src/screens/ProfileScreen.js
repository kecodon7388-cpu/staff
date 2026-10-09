import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useAuth } from '../auth';
import { getServer } from '../storage';
import { colors } from '../theme';
import { initials } from '../format';
import { presentGroups } from '../modules';
import { Badge, Button, Card, Row, SectionTitle } from '../components/ui';

export default function ProfileScreen({ navigation }) {
  const { profile, signOut, has, me, modules } = useAuth();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState('');
  useEffect(() => { getServer().then(setServer); }, []);

  const logout = () => Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất khỏi ứng dụng?', [
    { text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: signOut },
  ]);

  const roles = profile?.roles || [];
  const sp = profile?.shipper;
  const isShipper = has('shipper');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <View style={styles.glow} />
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.fullName)}</Text></View>
        <Text style={styles.name}>{profile?.fullName}</Text>
        <Text style={styles.sub}>{profile?.username}{profile?.branch ? ' · ' + profile.branch : ''}</Text>
        <View style={styles.roles}>
          {roles.length ? roles.map((r) => (
            <View key={r.code} style={styles.role}><Text style={styles.roleText}>{r.name}</Text></View>
          )) : <View style={styles.role}><Text style={styles.roleText}>{profile?.roleText || 'Nhân viên'}</Text></View>}
        </View>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionTitle title="Thông tin" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row icon="person-outline" label="Tên đăng nhập" value={profile?.username || '—'} />
          <Row icon="call-outline" label="Số điện thoại" value={profile?.phone || '—'} />
          <Row icon="mail-outline" label="Email" value={profile?.email || '—'} />
          <Row icon="business-outline" label="Chi nhánh" value={profile?.branch || '—'} last={!sp} />
          {sp ? <Row icon="id-card-outline" label="Mã shipper" value={sp.code} /> : null}
          {sp ? <Row icon="bicycle-outline" label="Biển số xe" value={sp.vehiclePlate || '—'} /> : null}
          {sp ? <Row icon="home-outline" label="Bưu cục" value={sp.warehouse || '—'} last /> : null}
        </Card>

        <SectionTitle title="Chức năng được cấp" />
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {presentGroups(modules).map((g) => <Badge key={g.key} text={g.title} fg={g.color} bg={g.bg} />)}
          </View>
          {(profile?.permissions || []).includes('*') ? <Text style={styles.note}>Toàn quyền hệ thống (Super Admin)</Text> : null}
        </Card>

        <SectionTitle title="Tiện ích" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          <Row icon="notifications-outline" label="Thông báo" value={me?.unreadNotifications ? `${me.unreadNotifications} chưa đọc` : ''} onPress={() => navigation.navigate('Notifications')} />
          {isShipper ? <Row icon="time-outline" label="Lịch sử công việc" value="" onPress={() => navigation.navigate('History')} /> : null}
          {isShipper ? <Row icon="wallet-outline" label="Tiền COD & nộp tiền" value="" onPress={() => navigation.navigate('Cod')} /> : null}
          <Row icon="key-outline" label="Đổi mật khẩu" value="" onPress={() => navigation.navigate('ChangePassword')} last />
        </Card>
        <SectionTitle title="Ứng dụng" />
        <Card padded={false} style={{ paddingHorizontal: 16 }}>
          {me?.company?.name ? <Row icon="briefcase-outline" label="Công ty" value={me.company.name} /> : null}
          <Row icon="server-outline" label="Máy chủ" value={server} />
          <Row icon="information-circle-outline" label="Phiên bản" value={`CE Staff ${Constants.expoConfig?.version || '1.0.0'}`} last />
        </Card>
        <Button title="Đăng xuất" icon="log-out-outline" variant="danger" onPress={logout} style={{ marginTop: 24 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, alignItems: 'center', paddingBottom: 26, overflow: 'hidden', paddingHorizontal: 16 },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: colors.brand, opacity: 0.3, top: -150, left: -80 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  name: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontSize: 13.5, marginTop: 4 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 },
  role: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  roleText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  note: { marginTop: 10, fontSize: 12.5, color: colors.muted },
});
