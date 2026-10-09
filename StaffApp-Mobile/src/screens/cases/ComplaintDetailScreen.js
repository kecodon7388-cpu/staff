/**
 * Chi tiết khiếu nại: thông tin, đơn liên quan, tệp đính kèm, trao đổi kiểu chat (gửi kèm ảnh – multipart "files").
 * "Xử lý" – DTO CaseProcessRequest: op (assign | processing | propose | close), assignTo, compensation, resolution.
 * "Duyệt" – DTO CaseApproveRequest: approve, note; chỉ hiện khi can('complaints.approve') và máy chủ trả action "approve".
 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { staff } from '../../api';
import { useAuth } from '../../auth';
import { useLookups } from '../../lookups';
import { hapticErr, hapticOk, useAction, useLoad } from '../../hooks';
import { colors } from '../../theme';
import { digits, dt, money } from '../../format';
import { Button, CaseBadge, Card, Field, ListState, MoneyField, Row, SectionTitle, Segmented, Sheet, call } from '../../components/ui';
import PickField from '../../components/PickField';

export async function pickPhotos(fromCamera) {
  const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert('Cần cấp quyền', fromCamera ? 'Cho phép camera để chụp ảnh' : 'Cho phép truy cập ảnh để đính kèm'); return []; }
  const r = fromCamera
    ? await ImagePicker.launchCameraAsync({ quality: 0.6, exif: false })
    : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsMultipleSelection: true, selectionLimit: 10, mediaTypes: ['images'] });
  return r.canceled ? [] : (r.assets || []).map((a) => a.uri);
}

export default function ComplaintDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { can, profile, canReadOrders } = useAuth();
  const { lookups } = useLookups();
  const fn = useCallback(async () => {
    const r = await staff.complaint(id);
    navigation.setOptions({ title: r.data.code });
    return r.data;
  }, [id, navigation]);
  const { data: c, error, loading, refreshing, refresh, reload } = useLoad(fn);
  const { busy, run } = useAction();
  const scroll = useRef(null);

  const [text, setText] = useState('');
  const [internal, setInternal] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [sending, setSending] = useState(false);
  const [procOpen, setProcOpen] = useState(false);
  const [op, setOp] = useState('processing');
  const [assignTo, setAssignTo] = useState(null);
  const [comp, setComp] = useState('');
  const [resolution, setResolution] = useState('');
  const [apprOpen, setApprOpen] = useState(false);
  const [approve, setApprove] = useState('yes');
  const [apprNote, setApprNote] = useState('');

  if (!c) return <ListState loading={loading} error={error} onRetry={reload} />;
  const actions = c.actions || [];
  const procOps = [
    actions.includes('assign') && { key: 'assign', label: 'Phân công' },
    actions.includes('processing') && { key: 'processing', label: 'Đang xử lý' },
    actions.includes('propose') && { key: 'propose', label: 'Đề xuất BT' },
    actions.includes('close') && { key: 'close', label: 'Đóng' },
  ].filter(Boolean);
  const canProcess = can('complaints.manage') && procOps.length > 0;
  const canApprove = can('complaints.approve') && actions.includes('approve');
  const canComment = actions.includes('comment');

  const addPhotos = async (cam) => { const u = await pickPhotos(cam); if (u.length) setPhotos((p) => [...p, ...u].slice(0, 10)); };

  const send = async () => {
    if (!text.trim() && photos.length === 0) return;
    setSending(true);
    try {
      const r = await staff.commentComplaint(id, { content: text.trim(), isInternal: internal, photos });
      hapticOk();
      if (r.warnings?.length) Alert.alert('Đã gửi', r.message);
      setText(''); setPhotos([]);
      await reload();
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) { hapticErr(); Alert.alert('Không gửi được', e.message); }
    finally { setSending(false); }
  };

  const openProcess = () => {
    setOp(procOps.find((o) => o.key === 'processing')?.key || procOps[0].key);
    setAssignTo(c.assignedTo?.id || null);
    setComp(c.compensation ? String(Math.round(c.compensation)) : c.suggested ? String(Math.round(c.suggested)) : '');
    setResolution(c.resolution || '');
    setProcOpen(true);
  };

  const submitProcess = async () => {
    if (op === 'assign' && !assignTo) return Alert.alert('Chọn nhân viên', 'Chọn nhân viên phụ trách');
    if (op === 'propose' && !resolution.trim()) return Alert.alert('Thiếu hướng xử lý', 'Nhập phương án / lý do đề xuất bồi thường');
    const compensation = op === 'propose' ? Number(digits(comp) || 0) : null;
    const opLabel = procOps.find((o) => o.key === op)?.label;
    setProcOpen(false);
    await new Promise((r) => setTimeout(r, 350));
    await run('process', () => staff.processComplaint(id, { op, assignTo: op === 'assign' ? assignTo : null, compensation, resolution: resolution.trim() || null }), {
      confirm: op === 'propose' ? { title: 'Đề xuất bồi thường', text: `Đề xuất bồi thường ${money(compensation)} và chuyển chờ phê duyệt?`, ok: 'Gửi duyệt' }
        : op === 'close' ? { title: 'Đóng khiếu nại', text: `Đóng ${c.code}? Không thể xử lý tiếp sau khi đóng.`, ok: 'Đóng', destructive: true }
          : { title: opLabel, text: `Cập nhật khiếu nại ${c.code}: ${opLabel}?`, ok: 'Cập nhật' },
      onDone: reload,
    });
  };

  const submitApprove = async () => {
    setApprOpen(false);
    await new Promise((r) => setTimeout(r, 350));
    await run('approve', () => staff.approveComplaint(id, { approve: approve === 'yes', note: apprNote.trim() || null }), {
      confirm: approve === 'yes'
        ? { title: 'Duyệt bồi thường', text: `Duyệt bồi thường ${money(c.compensation)} cho ${c.shop?.name}? Số tiền sẽ cộng vào công nợ shop.`, ok: 'Duyệt' }
        : { title: 'Từ chối bồi thường', text: `Từ chối bồi thường khiếu nại ${c.code}?`, ok: 'Từ chối', destructive: true },
      onDone: reload,
    });
  };

  const me = profile?.username;
  const imgs = (c.attachments || []).filter((a) => a.isImage);
  const files = (c.attachments || []).filter((a) => !a.isImage);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.code}>{c.code}</Text>
            <CaseBadge status={c.status} text={c.statusText} />
            <Text style={styles.type}>{c.typeText}</Text>
          </View>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.desc}>{c.description}</Text>
          <View style={styles.money}>
            <MoneyBox label="Shop yêu cầu" value={c.requested} />
            <MoneyBox label="Đề xuất theo CS" value={c.suggested} />
            <MoneyBox label="Bồi thường" value={c.compensation} strong />
          </View>
          {c.resolution ? <Text style={styles.resolution}>Hướng xử lý: {c.resolution}</Text> : null}
        </Card>

        <Card padded={false} style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Row icon="storefront-outline" label="Shop" value={`${c.shop?.name || '—'}${c.shop?.code ? ' · ' + c.shop.code : ''}`} onPress={c.shop?.phone ? () => call(c.shop.phone) : undefined} />
          <Row icon="person-outline" label="Phụ trách" value={c.assignedTo?.name || 'Chưa phân công'} />
          <Row icon="time-outline" label="Tạo" value={`${dt(c.createdAt)}${c.createdBy ? ' · ' + c.createdBy : ''}`} last={!c.approvedAt && !c.closedAt} />
          {c.approvedAt ? <Row icon="shield-checkmark-outline" label="Phê duyệt" value={`${c.approvedBy || ''} · ${dt(c.approvedAt)}`} last={!c.closedAt} /> : null}
          {c.closedAt ? <Row icon="lock-closed-outline" label="Đóng lúc" value={dt(c.closedAt)} last /> : null}
        </Card>

        {c.order ? (
          <>
            <SectionTitle title="Vận đơn liên quan" />
            <Card onPress={canReadOrders ? () => navigation.navigate('StaffOrderDetail', { id: c.order.id }) : undefined}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.oCode}>{c.order.trackingCode}</Text>
                  <Text style={styles.oSub}>{c.order.statusText} · {c.order.receiver}</Text>
                  <Text style={styles.oSub}>Khai giá {money(c.order.declaredValue)} · COD {money(c.order.codAmount)} · cước {money(c.order.totalFee)}{c.order.hasInsurance ? ' · có bảo hiểm' : ''}</Text>
                </View>
                {canReadOrders ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null}
              </View>
            </Card>
          </>
        ) : null}

        {(c.attachments || []).length ? (
          <>
            <SectionTitle title={`Tệp đính kèm (${c.attachments.length})`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {imgs.map((a) => (
                <Pressable key={a.id} onPress={() => a.url && Linking.openURL(a.url)}>
                  <Image source={{ uri: a.url }} style={styles.thumb} />
                </Pressable>
              ))}
            </ScrollView>
            {files.map((a) => (
              <Pressable key={a.id} onPress={() => a.url && Linking.openURL(a.url)} style={styles.file}>
                <Ionicons name="document-attach-outline" size={18} color={colors.brand} />
                <Text style={styles.fileName} numberOfLines={1}>{a.name}</Text>
                <Text style={styles.fileBy}>{a.by}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {canProcess || canApprove ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            {canProcess ? <Button title="Xử lý" icon="construct-outline" variant="dark" size="md" style={{ flex: 1 }} loading={busy === 'process'} onPress={openProcess} /> : null}
            {canApprove ? <Button title="Duyệt" icon="shield-checkmark" variant="success" size="md" style={{ flex: 1 }} loading={busy === 'approve'} onPress={() => { setApprove('yes'); setApprNote(''); setApprOpen(true); }} /> : null}
          </View>
        ) : null}

        <SectionTitle title={`Trao đổi (${(c.comments || []).length})`} />
        {(c.comments || []).length === 0 ? <Text style={styles.none}>Chưa có trao đổi</Text> : c.comments.map((m) => {
          const mine = m.by === me;
          const sys = (m.content || '').startsWith('[Hệ thống]');
          if (sys) return <Text key={m.id} style={styles.sys}>{m.content.replace('[Hệ thống] ', '')} · {m.by} · {dt(m.at)}</Text>;
          return (
            <View key={m.id} style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs, m.isInternal && styles.internal]}>
                <Text style={[styles.by, mine && { color: 'rgba(255,255,255,0.75)' }]}>{m.by}{m.isInternal ? ' · Nội bộ' : ''}</Text>
                <Text style={[styles.msg, mine && { color: '#fff' }]}>{m.content}</Text>
                <Text style={[styles.at, mine && { color: 'rgba(255,255,255,0.6)' }]}>{dt(m.at)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {canComment ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
          {photos.length ? (
            <ScrollView horizontal contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
              {photos.map((u) => (
                <Pressable key={u} onPress={() => setPhotos((p) => p.filter((x) => x !== u))}>
                  <Image source={{ uri: u }} style={styles.pThumb} />
                  <View style={styles.pX}><Ionicons name="close" size={12} color="#fff" /></View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.compRow}>
            <Pressable onPress={() => setInternal(!internal)} style={[styles.vis, internal ? styles.visInt : styles.visPub]} hitSlop={4}>
              <Ionicons name={internal ? 'lock-closed' : 'storefront'} size={13} color={internal ? colors.warning : colors.success} />
              <Text style={[styles.visText, { color: internal ? colors.warning : colors.success }]}>{internal ? 'Nội bộ' : 'Gửi shop'}</Text>
            </Pressable>
            <Pressable onPress={() => addPhotos(true)} hitSlop={6}><Ionicons name="camera-outline" size={23} color={colors.muted} /></Pressable>
            <Pressable onPress={() => addPhotos(false)} hitSlop={6}><Ionicons name="image-outline" size={23} color={colors.muted} /></Pressable>
          </View>
          <View style={styles.compRow}>
            <TextInput value={text} onChangeText={setText} placeholder={internal ? 'Ghi chú nội bộ (shop không thấy)…' : 'Nhắn cho shop…'} placeholderTextColor={colors.faint}
              style={styles.input} multiline />
            <Pressable onPress={send} disabled={sending || (!text.trim() && !photos.length)} style={[styles.send, (sending || (!text.trim() && !photos.length)) && { opacity: 0.4 }]}>
              <Ionicons name={sending ? 'hourglass-outline' : 'send'} size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : null}

      <Sheet visible={procOpen} title={`Xử lý ${c.code}`} onClose={() => setProcOpen(false)}
        footer={<Button title="Cập nhật" icon="checkmark" onPress={submitProcess} style={{ marginTop: 8 }} />}>
        <Segmented items={procOps} value={op} onChange={setOp} />
        <View style={{ height: 14 }} />
        {op === 'assign' ? (
          <>
            <PickField label="Nhân viên phụ trách" title="Chọn nhân viên" items={lookups?.staff} value={assignTo} onChange={(u) => setAssignTo(u?.id || null)} icon="person-outline" loading={!lookups} />
            {profile?.userId ? <Pressable onPress={() => setAssignTo(profile.userId)}><Text style={styles.link}>Giao cho tôi</Text></Pressable> : null}
          </>
        ) : null}
        {op === 'processing' ? <Text style={styles.help}>Chuyển khiếu nại sang trạng thái “Đang xử lý”.</Text> : null}
        {op === 'propose' ? (
          <>
            <MoneyField label={`Số tiền bồi thường đề xuất${c.suggested ? ' (CS gợi ý ' + money(c.suggested) + ')' : ''}`} value={comp} onChange={setComp} />
            <Field label="Phương án / lý do" icon="document-text-outline" value={resolution} onChangeText={setResolution} multiline inputStyle={{ minHeight: 70, textAlignVertical: 'top' }} />
            <Text style={styles.help}>Sau khi đề xuất, khiếu nại chuyển “Chờ phê duyệt”.</Text>
          </>
        ) : null}
        {op === 'close' ? (
          <Field label="Kết quả xử lý (tùy chọn)" icon="document-text-outline" value={resolution} onChangeText={setResolution} multiline inputStyle={{ minHeight: 70, textAlignVertical: 'top' }} />
        ) : null}
      </Sheet>

      <Sheet visible={apprOpen} title="Phê duyệt bồi thường" onClose={() => setApprOpen(false)}
        footer={<Button title={approve === 'yes' ? `Duyệt ${money(c.compensation)}` : 'Từ chối bồi thường'} icon={approve === 'yes' ? 'shield-checkmark' : 'close-circle'} variant={approve === 'yes' ? 'success' : 'dangerSolid'} onPress={submitApprove} style={{ marginTop: 8 }} />}>
        <Card style={{ marginBottom: 14 }}>
          <Text style={styles.help}>Đề xuất bồi thường</Text>
          <Text style={styles.big}>{money(c.compensation)}</Text>
          {c.resolution ? <Text style={styles.desc}>{c.resolution}</Text> : null}
        </Card>
        <Segmented items={[{ key: 'yes', label: 'Duyệt' }, { key: 'no', label: 'Từ chối' }]} value={approve} onChange={setApprove} />
        <View style={{ height: 14 }} />
        <Field label="Ghi chú gửi shop" icon="document-text-outline" value={apprNote} onChangeText={setApprNote} multiline inputStyle={{ minHeight: 60, textAlignVertical: 'top' }} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const MoneyBox = ({ label, value, strong }) => (
  <View style={styles.mBox}>
    <Text style={styles.mLbl}>{label}</Text>
    <Text style={[styles.mVal, strong && { color: colors.success }]}>{value ? money(value) : '—'}</Text>
  </View>
);


const styles = StyleSheet.create({
  code: { fontSize: 16, fontWeight: '800', color: colors.text },
  type: { marginLeft: 'auto', fontSize: 12.5, color: colors.muted, fontWeight: '600' },
  title: { fontSize: 16.5, fontWeight: '700', color: colors.text, marginTop: 10 },
  desc: { fontSize: 14, color: colors.text2, marginTop: 6, lineHeight: 20 },
  money: { flexDirection: 'row', gap: 8, marginTop: 14 },
  mBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 9 },
  mLbl: { fontSize: 11, color: colors.faint },
  mVal: { fontSize: 13.5, fontWeight: '800', color: colors.text, marginTop: 2 },
  resolution: { fontSize: 13, color: colors.info, marginTop: 10 },
  oCode: { fontSize: 15, fontWeight: '800', color: colors.text },
  oSub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#E2E8F0' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  fileName: { flex: 1, fontSize: 13.5, color: colors.text2 },
  fileBy: { fontSize: 11.5, color: colors.faint },
  none: { color: colors.faint, textAlign: 'center' },
  sys: { textAlign: 'center', fontSize: 11.5, color: colors.faint, marginVertical: 6, paddingHorizontal: 20 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubble: { maxWidth: '82%', padding: 10, borderRadius: 16 },
  mine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  internal: { borderWidth: 1.5, borderColor: '#FCD34D' },
  by: { fontSize: 11.5, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  msg: { fontSize: 14, color: colors.text, lineHeight: 19 },
  at: { fontSize: 10.5, color: colors.faint, marginTop: 4, textAlign: 'right' },
  composer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingTop: 8 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  vis: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginRight: 'auto' },
  visInt: { backgroundColor: colors.warningBg },
  visPub: { backgroundColor: colors.successBg },
  visText: { fontSize: 12, fontWeight: '700' },
  input: { flex: 1, minHeight: 42, maxHeight: 110, backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11, fontSize: 14.5, color: colors.text },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  pThumb: { width: 58, height: 58, borderRadius: 10 },
  pX: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  help: { fontSize: 13, color: colors.muted, marginBottom: 10 },
  link: { color: colors.brand, fontWeight: '700', marginTop: -6, marginBottom: 10 },
  big: { fontSize: 26, fontWeight: '800', color: colors.text },
});
