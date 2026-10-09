import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import SignatureScreen from 'react-native-signature-canvas';
import { Ionicons } from '@expo/vector-icons';
import { shipper } from '../../api';
import { sendCurrentPosition } from '../../location';
import { colors, radius } from '../../theme';
import { money, num } from '../../format';
import { Button, Card, Field, SectionTitle } from '../../components/ui';

export default function DeliverScreen({ route, navigation }) {
  const { id, order } = route.params;
  const insets = useSafeAreaInsets();
  const [collected, setCollected] = useState(String(Math.round(order.amountToCollect || 0)));
  const [recipient, setRecipient] = useState(order.receiver?.name || '');
  const [otp, setOtp] = useState('');
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [signOpen, setSignOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sigRef = useRef(null);

  const amount = Number((collected || '0').replace(/[^\d]/g, ''));
  const mismatch = amount !== Math.round(order.amountToCollect || 0);

  const takePhoto = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) { Alert.alert('Cần quyền camera', 'Vui lòng cho phép camera để chụp ảnh giao hàng'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.55, allowsEditing: false, exif: false });
    if (!r.canceled && r.assets?.length) setPhoto(r.assets[0].uri);
  };

  const submit = () => {
    if (!otp && !photo && !signature) {
      Alert.alert('Thiếu bằng chứng giao hàng', 'Cần ít nhất một trong: mã OTP của người nhận, ảnh chụp hoặc chữ ký.');
      return;
    }
    const go = async () => {
      setBusy(true);
      try {
        const r = await shipper.deliver(id, { otp: otp.trim(), recipientName: recipient.trim(), collected: amount, photoUri: photo, signature });
        sendCurrentPosition();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('Giao thành công', r.message || 'Đã cập nhật đơn hàng');
        navigation.navigate('Main', { screen: 'Tasks', params: { type: 'delivery' } });
      } catch (e) { Alert.alert('Chưa giao được', e.message); }
      finally { setBusy(false); }
    };
    if (mismatch) {
      Alert.alert('Số tiền khác số phải thu', `Phải thu ${money(order.amountToCollect)}, bạn nhập ${money(amount)}. Tiếp tục?`,
        [{ text: 'Sửa lại', style: 'cancel' }, { text: 'Vẫn xác nhận', style: 'destructive', onPress: go }]);
    } else go();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Card style={styles.collectCard}>
          <Text style={styles.collectLabel}>Số tiền phải thu người nhận</Text>
          <Text style={styles.collectValue}>{money(order.amountToCollect)}</Text>
          <Text style={styles.collectSub}>COD {money(order.codAmount)}{order.paymentMethod === 'RECEIVER' ? ` + cước ${money(order.totalFee)}` : ' · cước shop trả'}</Text>
        </Card>

        <SectionTitle title="Thu tiền" />
        <Field label="Số tiền đã thu thực tế (đ)" icon="cash-outline" keyboardType="number-pad" value={collected ? num(collected.replace(/[^\d]/g, '')) : ''}
          onChangeText={(t) => setCollected(t.replace(/[^\d]/g, ''))} inputStyle={{ fontSize: 18, fontWeight: '700' }}
          right={mismatch ? (
            <Pressable onPress={() => setCollected(String(Math.round(order.amountToCollect || 0)))} style={styles.fix}><Text style={styles.fixText}>Đúng số</Text></Pressable>
          ) : <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginRight: 14 }} />} />
        {mismatch ? <Text style={styles.mismatch}>Số tiền khác số phải thu – điều phối sẽ kiểm tra lại</Text> : null}

        <SectionTitle title="Người nhận & bằng chứng" />
        <Field label="Tên người nhận thực tế" icon="person-outline" value={recipient} onChangeText={setRecipient} placeholder="Họ tên người nhận hàng" />
        <Field label={order.otpRequired ? 'Mã OTP người nhận (đã gửi qua SMS)' : 'Mã OTP (nếu có)'} icon="keypad-outline" keyboardType="number-pad"
          maxLength={6} value={otp} onChangeText={setOtp} placeholder="6 chữ số" inputStyle={{ letterSpacing: 4, fontSize: 18, fontWeight: '700' }} />

        <View style={styles.proofRow}>
          <Pressable style={styles.proofBox} onPress={takePhoto}>
            {photo ? <Image source={{ uri: photo }} style={styles.proofImg} /> : (
              <>
                <Ionicons name="camera-outline" size={28} color={colors.brand} />
                <Text style={styles.proofText}>Chụp ảnh giao hàng</Text>
              </>
            )}
            {photo ? <View style={styles.proofTag}><Ionicons name="refresh" size={13} color="#fff" /><Text style={styles.proofTagText}>Chụp lại</Text></View> : null}
          </Pressable>
          <Pressable style={styles.proofBox} onPress={() => setSignOpen(true)}>
            {signature ? <Image source={{ uri: signature }} style={[styles.proofImg, { resizeMode: 'contain', backgroundColor: '#fff' }]} /> : (
              <>
                <Ionicons name="create-outline" size={28} color={colors.brand} />
                <Text style={styles.proofText}>Chữ ký người nhận</Text>
              </>
            )}
            {signature ? <View style={styles.proofTag}><Ionicons name="refresh" size={13} color="#fff" /><Text style={styles.proofTagText}>Ký lại</Text></View> : null}
          </Pressable>
        </View>
        <Text style={styles.proofHint}>Cần ít nhất 1 bằng chứng: OTP đúng, ảnh chụp hoặc chữ ký.</Text>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        <Button title={`Xác nhận giao · thu ${money(amount)}`} icon="checkmark-circle" variant="success" loading={busy} onPress={submit} />
      </View>

      <Modal visible={signOpen} animationType="slide" onRequestClose={() => setSignOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          <View style={styles.signHead}>
            <Pressable onPress={() => setSignOpen(false)} hitSlop={10}><Ionicons name="close" size={26} color={colors.text} /></Pressable>
            <Text style={styles.signTitle}>Chữ ký người nhận</Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={{ flex: 1, margin: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden' }}>
            <SignatureScreen
              ref={sigRef}
              onOK={(sig) => { setSignature(sig); setSignOpen(false); }}
              onEmpty={() => Alert.alert('Chưa có chữ ký', 'Vui lòng ký vào khung')}
              descriptionText="Người nhận ký vào khung"
              clearText="Xóa"
              confirmText="Lưu chữ ký"
              autoClear={false}
              imageType="image/png"
              webStyle={`.m-signature-pad{box-shadow:none;border:none;margin:0}.m-signature-pad--body{border:none}
                .m-signature-pad--footer .button{background:${colors.brand};color:#fff;border-radius:10px;height:44px;padding:0 18px;font-weight:600}
                .m-signature-pad--footer .button.clear{background:#F1F5F9;color:#334155}
                .m-signature-pad--footer .description{color:#94A3B8}`}
            />
          </View>
          <View style={{ paddingBottom: insets.bottom + 8 }} />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  collectCard: { backgroundColor: colors.navy, borderColor: colors.navy },
  collectLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  collectValue: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  collectSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, marginTop: 4 },
  fix: { marginRight: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.brand50, borderRadius: 8 },
  fixText: { color: colors.brand600, fontWeight: '700', fontSize: 12.5 },
  mismatch: { color: colors.warning, fontSize: 12.5, marginTop: -6, marginBottom: 6 },
  proofRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  proofBox: { flex: 1, height: 130, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#BFD0F5', backgroundColor: colors.brand50,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 6 },
  proofImg: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  proofText: { color: colors.brand600, fontWeight: '600', fontSize: 13 },
  proofTag: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.7)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  proofTagText: { color: '#fff', fontSize: 11.5, fontWeight: '600' },
  proofHint: { fontSize: 12.5, color: colors.faint, marginTop: 10 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  signHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  signTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
});
