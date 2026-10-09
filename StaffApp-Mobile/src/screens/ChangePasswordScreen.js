import React, { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { staff } from '../api';
import { colors } from '../theme';
import { Button, Field } from '../components/ui';

export default function ChangePasswordScreen({ navigation }) {
  const [cur, setCur] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pwd.length < 6) { Alert.alert('Mật khẩu mới tối thiểu 6 ký tự'); return; }
    if (pwd !== pwd2) { Alert.alert('Mật khẩu nhập lại không khớp'); return; }
    setBusy(true);
    try { await staff.changePassword(cur, pwd); Alert.alert('Thành công', 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.'); navigation.goBack(); }
    catch (e) { Alert.alert('Không đổi được', e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Field label="Mật khẩu hiện tại" icon="lock-closed-outline" secureTextEntry value={cur} onChangeText={setCur} />
      <Field label="Mật khẩu mới" icon="key-outline" secureTextEntry value={pwd} onChangeText={setPwd} placeholder="Tối thiểu 6 ký tự" />
      <Field label="Nhập lại mật khẩu mới" icon="key-outline" secureTextEntry value={pwd2} onChangeText={setPwd2} />
      <Button title="Đổi mật khẩu" icon="checkmark" loading={busy} onPress={submit} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
