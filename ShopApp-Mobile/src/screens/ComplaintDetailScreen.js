import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useLoad } from '../hooks';
import { pickPhotos } from '../photos';
import { colors, font, genericColor } from '../theme';
import { dt, money } from '../format';
import { Card, ErrorBanner, Loading, Notice, SectionTitle, StatusBadge, hapticError, hapticSuccess } from '../components/ui';

const isImage = (name, url) => /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(name || url || '');

export default function ComplaintDetailScreen({ navigation, route }) {
  const id = route.params?.id;
  const insets = useSafeAreaInsets();
  const { data: res, loading, refreshing, error, reload, refresh, silent } = useLoad(() => api.complaint(id), [id]);
  const c = res?.data;
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState(null);
  const scrollRef = useRef(null);

  useLayoutEffect(() => { if (c?.code) navigation.setOptions({ title: c.code }); }, [navigation, c?.code]);

  const attach = async () => {
    const uris = await pickPhotos(5 - photos.length);
    if (uris.length) setPhotos([...photos, ...uris].slice(0, 5));
  };

  const send = async () => {
    if (!text.trim() && !photos.length) return;
    setSending(true);
    try {
      const r = await api.commentComplaint(id, { content: text.trim(), photos });
      hapticSuccess();
      setText(''); setPhotos([]);
      if (r.warnings?.length) Alert.alert('Lưu ý', r.message);
      await silent();
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 250);
    } catch (e) { hapticError(); Alert.alert('Không gửi được', e.message); } finally { setSending(false); }
  };

  if (loading && !c) return <Loading />;
  if (!c) return <View style={{ padding: 16 }}><ErrorBanner message={error || 'Không tải được khiếu nại'} onRetry={reload} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        keyboardShouldPersistTaps="handled"
      >
        <ErrorBanner message={error} onRetry={reload} style={{ marginBottom: 10 }} />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[font.small, { flex: 1 }]}>{c.typeText} · {dt(c.createdAt)}</Text>
            <StatusBadge status={c.status} text={c.statusText} colorFn={genericColor} />
          </View>
          <Text style={[font.h2, { marginTop: 8 }]}>{c.title}</Text>
          <Text style={[font.body, { marginTop: 8, lineHeight: 21 }]}>{c.description}</Text>
          {c.order ? (
            <Pressable onPress={() => navigation.navigate('OrderDetail', { id: c.order.id })} style={styles.orderLink}>
              <Ionicons name="cube-outline" size={18} color={colors.brand600} />
              <Text style={{ flex: 1, color: colors.brand600, fontWeight: '700' }}>Đơn {c.order.trackingCode}</Text>
              <Text style={font.small}>{c.order.statusText}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.brand600} />
            </Pressable>
          ) : null}
          <View style={styles.amounts}>
            <View style={{ flex: 1 }}>
              <Text style={font.small}>Số tiền yêu cầu</Text>
              <Text style={styles.amt}>{money(c.requested)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={font.small}>Bồi thường duyệt</Text>
              <Text style={[styles.amt, { color: c.compensation ? colors.success : colors.faint }]}>{money(c.compensation)}</Text>
            </View>
          </View>
          {c.resolution ? <Notice tone={c.status === 'Rejected' ? 'danger' : 'info'} icon="document-text" text={'Kết quả xử lý: ' + c.resolution} style={{ marginTop: 12 }} /> : null}
          {c.closedAt ? <Text style={[font.tiny, { marginTop: 8 }]}>Đóng lúc {dt(c.closedAt)}</Text> : null}
        </Card>

        {(c.attachments || []).length ? (
          <>
            <SectionTitle title={`Tệp đính kèm (${c.attachments.length})`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {c.attachments.map((a) => (
                isImage(a.name, a.url) && a.url ? (
                  <Pressable key={a.id} onPress={() => setViewer(a.url)}>
                    <Image source={{ uri: a.url }} style={styles.thumb} />
                  </Pressable>
                ) : (
                  <View key={a.id} style={[styles.thumb, styles.fileThumb]}>
                    <Ionicons name="document-outline" size={26} color={colors.muted} />
                    <Text style={font.tiny} numberOfLines={2}>{a.name}</Text>
                  </View>
                )
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionTitle title="Trao đổi với CSKH" />
        {(c.comments || []).length ? c.comments.map((m) => (
          <View key={m.id} style={[styles.msgRow, m.mine && { justifyContent: 'flex-end' }]}>
            <View style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
              {!m.mine ? <Text style={styles.by}>{m.by}</Text> : null}
              <Text style={[styles.msg, m.mine && { color: '#fff' }]}>{m.content}</Text>
              <Text style={[styles.time, m.mine && { color: 'rgba(255,255,255,0.75)' }]}>{dt(m.at)}</Text>
            </View>
          </View>
        )) : <Text style={[font.small, { textAlign: 'center', marginVertical: 12 }]}>Chưa có trao đổi. CSKH sẽ phản hồi sớm nhất.</Text>}
      </ScrollView>

      {c.canComment ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          {photos.length ? (
            <ScrollView horizontal contentContainerStyle={{ gap: 8, paddingBottom: 8 }} showsHorizontalScrollIndicator={false}>
              {photos.map((u, i) => (
                <View key={u + i}>
                  <Image source={{ uri: u }} style={styles.pending} />
                  <Pressable onPress={() => setPhotos(photos.filter((_, j) => j !== i))} style={styles.remove} hitSlop={6}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Pressable onPress={attach} disabled={photos.length >= 5} style={[styles.iconBtn, photos.length >= 5 && { opacity: 0.4 }]}>
              <Ionicons name="camera-outline" size={22} color={colors.brand600} />
            </Pressable>
            <TextInput value={text} onChangeText={setText} placeholder="Nhập nội dung trao đổi..." placeholderTextColor={colors.faint}
              style={styles.input} multiline />
            <Pressable onPress={send} disabled={sending || (!text.trim() && !photos.length)}
              style={[styles.sendBtn, (!text.trim() && !photos.length) && { opacity: 0.4 }]}>
              {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.closed, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={font.small}>Khiếu nại đã đóng. Tạo khiếu nại mới nếu cần hỗ trợ thêm.</Text>
        </View>
      )}

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : null}
          <Text style={{ color: '#fff', marginTop: 12 }}>Chạm để đóng</Text>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  orderLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: colors.brand50 },
  amounts: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF1F6' },
  amt: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  thumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: '#E2E8F0' },
  fileThumb: { alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  mine: { backgroundColor: colors.brand, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  by: { fontSize: 12, fontWeight: '700', color: colors.brand600, marginBottom: 2 },
  msg: { fontSize: 14.5, color: colors.text, lineHeight: 20 },
  time: { fontSize: 10.5, color: colors.faint, marginTop: 4, alignSelf: 'flex-end' },
  composer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingTop: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#F1F5F9', borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  pending: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#E2E8F0' },
  remove: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  closed: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border, padding: 14, alignItems: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
});
