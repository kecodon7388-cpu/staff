import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { api } from '../api';
import { colors } from '../theme';
import { Button, Card, Field, Notice, hapticError, hapticSuccess } from '../components/ui';

export default function ChangePasswordScreen({ navigation }) {
  const [cur, setCur] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!cur) { Alert.alert('Thiếu thông tin', 'Nhập mật khẩu hiện tại'); return; }
    if (pwd.length < 6) { Alert.alert('Mật khẩu chưa hợp lệ', 'Mật khẩu mới tối thiểu 6 ký tự'); return; }
    if (pwd !== pwd2) { Alert.alert('Mật khẩu chưa khớp', 'Mật khẩu nhập lại không khớp'); return; }
    setBusy(true);
    try {
      const r = await api.changePassword(cur, pwd);
      hapticSuccess();
      Alert.alert('Thành công', r.message || 'Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.');
      navigation.goBack();
    } catch (e) { hapticError(); Alert.alert('Không đổi được', e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Notice icon="shield-checkmark-outline" text="Sau khi đổi mật khẩu, các thiết bị khác đang đăng nhập tài khoản này sẽ bị đăng xuất." style={{ marginBottom: 14 }} />
        <Card>
          <Field label="Mật khẩu hiện tại" icon="lock-closed-outline" secureTextEntry value={cur} onChangeText={setCur} />
          <Field label="Mật khẩu mới" icon="key-outline" secureTextEntry value={pwd} onChangeText={setPwd} placeholder="Tối thiểu 6 ký tự" />
          <Field label="Nhập lại mật khẩu mới" icon="key-outline" secureTextEntry value={pwd2} onChangeText={setPwd2} style={{ marginBottom: 0 }} />
        </Card>
        <Button title="Đổi mật khẩu" icon="checkmark" loading={busy} onPress={submit} style={{ marginTop: 18 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
