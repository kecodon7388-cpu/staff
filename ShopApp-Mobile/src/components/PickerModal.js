import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../theme';
import { fold } from '../format';

/**
 * Hộp chọn có ô tìm kiếm.
 * items: [{ id, name, sub? }]; value: id đang chọn; onSelect(item)
 */
export default function PickerModal({ visible, title, items, value, onSelect, onClose, loading, searchPlaceholder = 'Tìm kiếm...', emptyText = 'Không có dữ liệu', allowClear, clearLabel = 'Bỏ chọn' }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  useEffect(() => { if (visible) setQ(''); }, [visible]);

  const list = useMemo(() => {
    const k = fold(q.trim());
    const src = items || [];
    if (!k) return src;
    return src.filter((it) => fold(it.name).includes(k) || (it.sub && fold(it.sub).includes(k)));
  }, [items, q]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.head, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12 }]}>
          <Text style={[font.h2, { flex: 1 }]} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}><Ionicons name="close" size={20} color={colors.text2} /></Pressable>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder={searchPlaceholder} placeholderTextColor={colors.faint}
            style={styles.search} autoCorrect={false} returnKeyType="search" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
        </View>
        {loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} /> : (
          <FlatList
            data={list}
            keyExtractor={(it) => String(it.id)}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            ListHeaderComponent={allowClear && value ? (
              <Pressable onPress={() => onSelect(null)} style={styles.item}>
                <Text style={[styles.itemText, { color: colors.danger }]}>{clearLabel}</Text>
              </Pressable>
            ) : null}
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
            renderItem={({ item }) => {
              const active = item.id === value;
              return (
                <Pressable onPress={() => onSelect(item)} style={({ pressed }) => [styles.item, pressed && { backgroundColor: '#EEF2F7' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemText, active && { color: colors.brand600, fontWeight: '700' }]}>{item.name}</Text>
                    {item.sub ? <Text style={styles.sub} numberOfLines={2}>{item.sub}</Text> : null}
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : null}
                </Pressable>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 10, backgroundColor: colors.bg },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E9EDF4', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, height: 46,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong },
  search: { flex: 1, fontSize: 15.5, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEF1F6', backgroundColor: '#fff' },
  itemText: { fontSize: 15.5, color: colors.text },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 14 },
});
