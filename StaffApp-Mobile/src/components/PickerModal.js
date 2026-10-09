/**
 * PickerModal – chọn 1 mục từ danh sách có ô tìm kiếm (bỏ dấu tiếng Việt).
 * Dùng chọn shipper, kho, vị trí, tỉnh/quận, khách hàng, nhân viên...
 *
 * props:
 *  visible, title, items, onClose, onSelect(item)
 *  getKey(item), getLabel(item), getSub(item), getSearch(item) → chuỗi dùng để tìm
 *  selectedKey, renderRight(item), loading, error, emptyText, allowClear (hiện dòng "Bỏ chọn" → onSelect(null))
 *  onSearch(text) – nếu có: tìm phía máy chủ (VD khách hàng), gọi khi dừng gõ 400ms
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../theme';
import { matches } from '../format';

export default function PickerModal({
  visible, title, items, onClose, onSelect,
  getKey = (i) => i.id, getLabel = (i) => i.name, getSub, getSearch, selectedKey, renderRight,
  loading, error, emptyText = 'Không có dữ liệu', allowClear, clearText = 'Tất cả / bỏ chọn', onSearch, placeholder = 'Tìm kiếm (không cần dấu)',
}) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const timer = useRef(null);

  useEffect(() => { if (visible) setQ(''); }, [visible]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (t) => {
    setQ(t);
    if (onSearch) { clearTimeout(timer.current); timer.current = setTimeout(() => onSearch(t), 400); }
  };

  const list = useMemo(() => {
    const all = items || [];
    if (!q.trim()) return all;
    return all.filter((it) => matches(q, getSearch ? getSearch(it) : [getLabel(it), getSub ? getSub(it) : ''].join(' ')));
  }, [items, q, getLabel, getSub, getSearch]);

  const pick = (it) => { onSelect && onSelect(it); onClose && onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.head, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 10 }]}>
          <Text style={font.h3} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={26} color={colors.text} /></Pressable>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput value={q} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.faint}
            style={styles.input} autoCorrect={false} returnKeyType="search" />
          {q ? <Pressable onPress={() => onChange('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
        </View>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <FlatList
          data={list}
          keyExtractor={(it, i) => String(getKey(it) ?? i)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={allowClear ? (
            <Pressable onPress={() => pick(null)} style={styles.row}>
              <Ionicons name="remove-circle-outline" size={20} color={colors.muted} />
              <Text style={[styles.label, { color: colors.muted }]}>{clearText}</Text>
              {selectedKey == null ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
            </Pressable>
          ) : null}
          renderItem={({ item }) => {
            const on = selectedKey != null && String(getKey(item)) === String(selectedKey);
            return (
              <Pressable onPress={() => pick(item)} style={({ pressed }) => [styles.row, on && { backgroundColor: colors.brand50 }, pressed && { backgroundColor: '#EEF2F7' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, on && { color: colors.brand600 }]} numberOfLines={1}>{getLabel(item)}</Text>
                  {getSub && getSub(item) ? <Text style={styles.sub} numberOfLines={2}>{getSub(item)}</Text> : null}
                </View>
                {renderRight ? renderRight(item) : null}
                {on ? <Ionicons name="checkmark" size={20} color={colors.brand} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={loading
            ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} size="large" />
            : <Text style={styles.empty}>{q ? 'Không tìm thấy kết quả phù hợp' : emptyText}</Text>}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginTop: 4, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#EEF1F6', backgroundColor: '#fff' },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  err: { color: colors.danger, paddingHorizontal: 16, marginBottom: 8 },
});
