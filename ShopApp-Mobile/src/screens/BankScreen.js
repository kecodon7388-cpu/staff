import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { Button, Card, Field, Notice, hapticError, hapticSuccess } from '../components/ui';

export default function BankScreen({ navigation }) {
  const { profile, updateProfile } = useAuth();
  const shop = profile?.shop || {};
  const [bankName, setBankName] = useState(shop.bankName || '');
  const [bankAccount, setBankAccount] = useState(shop.bankAccount || '');
  const [holder, setHolder] = useState(shop.bankAccountName || '');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!bankName.trim() || bankAccount.replace(/[^0-9a-z]/gi, '').length < 6 || !holder.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập đủ tên ngân hàng, số tài khoản (tối thiểu 6 ký tự) và tên chủ tài khoản.'); return;
    }
    if (!pwd) { Alert.alert('Cần xác nhận', 'Nhập mật khẩu đăng nhập để xác nhận thay đổi.'); return; }
    Alert.alert('Đổi tài khoản nhận tiền', `Tiền COD sẽ được chuyển vào:\n${bankAccount} – ${bankName}\n${holder.toUpperCase()}`, [
      { text: 'Kiểm tra lại', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          setBusy(true);
          try {
            const r = await api.updateBank({ bankName: bankName.trim(), bankAccount: bankAccount.trim(), bankAccountName: holder.trim(), currentPassword: pwd });
            hapticSuccess();
            try { const me = await api.me(); if (me?.profile) await updateProfile(me.profile); } catch { /* bỏ qua */ }
            Alert.alert('Thành công', r.message || 'Đã cập nhật tài khoản ngân hàng');
            navigation.goBack();
          } catch (e) { hapticError(); Alert.alert('Không cập nhật được', e.message); } finally { setBusy(false); }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Notice tone="warning" icon="shield-outline" style={{ marginBottom: 14 }}
          text="Vì an toàn, mọi thay đổi tài khoản nhận tiền đều được thông báo tới email shop và bộ phận kế toán." />
        <Card>
          <Field label="Tên ngân hàng" required icon="business-outline" value={bankName} onChangeText={setBankName} placeholder="VD: Vietcombank – CN Hà Nội" />
          <Field label="Số tài khoản" required icon="card-outline" value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" placeholder="Số tài khoản" />
          <Field label="Tên chủ tài khoản" required icon="person-outline" value={holder} onChangeText={setHolder} autoCapitalize="characters" placeholder="NGUYEN VAN A" />
          <Field label="Mật khẩu đăng nhập" required icon="lock-closed-outline" value={pwd} onChangeText={setPwd} secureTextEntry
            placeholder="Xác nhận bằng mật khẩu" style={{ marginBottom: 0 }} />
        </Card>
        <Button title="Lưu tài khoản nhận tiền" icon="checkmark" onPress={submit} loading={busy} style={{ marginTop: 18 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
