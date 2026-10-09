import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, font, radius, shadow, statusColor } from '../theme';

export const Card = ({ style, children, onPress, padded = true }) => {
  const content = <View style={[styles.card, padded && { padding: 16 }, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: pressed ? 0.96 : 1 }]}>
      {content}
    </Pressable>
  );
};

export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, style, size = 'lg' }) {
  const v = {
    primary: { bg: colors.brand, fg: '#fff', border: colors.brand },
    success: { bg: colors.success, fg: '#fff', border: colors.success },
    danger: { bg: '#fff', fg: colors.danger, border: '#FECACA' },
    dangerSolid: { bg: colors.danger, fg: '#fff', border: colors.danger },
    outline: { bg: '#fff', fg: colors.text, border: colors.borderStrong },
    soft: { bg: colors.brand50, fg: colors.brand600, border: colors.brand100 },
    dark: { bg: colors.navy, fg: '#fff', border: colors.navy },
  }[variant] || { bg: colors.brand, fg: '#fff', border: colors.brand };
  const h = size === 'lg' ? 52 : size === 'md' ? 44 : 36;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { height: h, backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'primary' || variant === 'success' ? styles.btnShadow : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={v.fg} /> : null}
          <Text style={{ color: v.fg, fontWeight: '700', fontSize: size === 'sm' ? 13 : 15.5 }} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Badge = ({ text, fg = colors.brand600, bg = colors.brand100, style, icon }) => (
  <View style={[styles.badge, { backgroundColor: bg }, style]}>
    {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
    <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
  </View>
);

export const StatusBadge = ({ status, text, colorFn = statusColor }) => {
  const c = colorFn(status);
  return <Badge text={text || status} fg={c.fg} bg={c.bg} />;
};

export const IconCircle = ({ name, color = colors.brand, bg = colors.brand50, size = 40 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 3.2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={size * 0.5} color={color} />
  </View>
);

export function Field({ label, icon, right, style, inputStyle, hint, required, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text> : null}
      <View style={[styles.inputWrap, props.multiline && { alignItems: 'flex-start' }, props.editable === false && { backgroundColor: '#F1F5F9' }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.faint} style={{ marginLeft: 14, marginTop: props.multiline ? 14 : 0 }} /> : null}
        <TextInput placeholderTextColor={colors.faint}
          style={[styles.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, inputStyle]} {...props} />
        {right}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Ô chọn (mở PickerModal / sheet) có giao diện giống Field */
export function SelectField({ label, value, placeholder, onPress, icon, disabled, required, style }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text> : null}
      <Pressable onPress={onPress} disabled={disabled}
        style={({ pressed }) => [styles.inputWrap, { paddingRight: 12, opacity: disabled ? 0.55 : pressed ? 0.8 : 1 }]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.faint} style={{ marginLeft: 14 }} /> : null}
        <Text style={[styles.input, { color: value ? colors.text : colors.faint }]} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.faint} />
      </Pressable>
    </View>
  );
}

export const SectionTitle = ({ title, right, style }) => (
  <View style={[styles.sectionRow, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {right}
  </View>
);

export const Row = ({ icon, label, value, onPress, valueStyle, last, right }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.6 }]}>
    {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={{ width: 26 }} /> : null}
    <Text style={styles.rowLabel}>{label}</Text>
    {value != null && value !== '' ? <Text style={[styles.rowValue, valueStyle]} numberOfLines={2}>{value}</Text> : null}
    {right}
    {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
  </Pressable>
);

export const Divider = ({ style }) => <View style={[{ height: 1, backgroundColor: '#EEF1F6', marginVertical: 10 }, style]} />;

export const Empty = ({ icon = 'file-tray-outline', title, text, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
      <Ionicons name={icon} size={34} color={colors.faint} />
    </View>
    <Text style={[font.h3, { textAlign: 'center' }]}>{title}</Text>
    {text ? <Text style={[font.small, { textAlign: 'center', marginTop: 6 }]}>{text}</Text> : null}
    {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
  </View>
);

export const Loading = ({ style }) => (
  <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }, style]}><ActivityIndicator size="large" color={colors.brand} /></View>
);

/** Thanh báo lỗi có nút Thử lại */
export const ErrorBanner = ({ message, onRetry, style }) => {
  if (!message) return null;
  return (
    <View style={[styles.errBanner, style]}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.errText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} style={styles.errRetry}>
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

/** Thanh thông tin / cảnh báo */
export const Notice = ({ icon = 'information-circle', text, tone = 'info', onPress, style }) => {
  const t = {
    info: { fg: colors.brand600, bg: colors.brand50, border: colors.brand100 },
    warning: { fg: '#92400E', bg: colors.warningBg, border: '#FDE68A' },
    danger: { fg: '#991B1B', bg: colors.dangerBg, border: '#FECACA' },
  }[tone];
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      <Ionicons name={icon} size={18} color={t.fg} />
      <Text style={{ flex: 1, color: t.fg, fontSize: 13.5, lineHeight: 19 }}>{text}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={t.fg} /> : null}
    </Pressable>
  );
};

export function Segmented({ items, value, onChange, style }) {
  return (
    <View style={[styles.seg, style]}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[styles.segItem, active && styles.segActive]}>
            <Text style={[styles.segText, active && { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{it.label}</Text>
            {it.count != null ? (
              <View style={[styles.segCount, active && { backgroundColor: colors.brand }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.muted }}>{it.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Chip lọc / chọn */
export const Chip = ({ label, active, onPress, count, icon, style }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.fchip, active && styles.fchipActive, pressed && { opacity: 0.8 }, style]}>
    {icon ? <Ionicons name={icon} size={14} color={active ? '#fff' : colors.text2} /> : null}
    <Text style={[styles.fchipText, active && { color: '#fff' }]} numberOfLines={1}>{label}</Text>
    {count != null ? (
      <View style={[styles.fchipCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.muted }}>{count}</Text>
      </View>
    ) : null}
  </Pressable>
);

/** Hàng chip cuộn ngang */
export const ChipBar = ({ children, style, contentStyle }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]}
    contentContainerStyle={[{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }, contentStyle]}>
    {children}
  </ScrollView>
);

/** Nhóm chip xuống dòng */
export const ChipWrap = ({ children, style }) => <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;

/** Nút tròn nhỏ: gọi điện / nhắn tin */
export const ActionChip = ({ icon, label, onPress, color = colors.brand, bg = colors.brand50 }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]} hitSlop={6}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.chipText, { color }]}>{label}</Text>
  </Pressable>
);

/** Dòng bật/tắt */
export const ToggleRow = ({ icon, label, hint, value, onValueChange, last }) => (
  <View style={[styles.row, !last && styles.rowBorder, { paddingVertical: 10 }]}>
    {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={{ width: 26 }} /> : null}
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14.5, color: colors.text, fontWeight: '600' }}>{label}</Text>
      {hint ? <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>{hint}</Text> : null}
    </View>
    <Switch value={!!value} onValueChange={onValueChange} trackColor={{ true: colors.brand, false: '#CBD5E1' }}
      thumbColor={Platform.OS === 'android' ? '#fff' : undefined} />
  </View>
);

/** Bottom sheet đơn giản dựa trên Modal */
export function Sheet({ visible, onClose, title, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={[font.h2, { flex: 1 }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}><Ionicons name="close" size={20} color={colors.text2} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Thanh tiêu đề navy cho các tab chính */
export function NavyHeader({ title, subtitle, right, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navy, { paddingTop: insets.top + 12 }]}>
      <View style={styles.navyGlow} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {subtitle ? <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{subtitle}</Text> : null}
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Nút tròn mờ trên header navy */
export const HeaderIconButton = ({ icon, onPress, badge }) => (
  <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.hIcon, pressed && { opacity: 0.7 }]}>
    <Ionicons name={icon} size={21} color="#fff" />
    {badge ? (
      <View style={styles.hBadge}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{badge > 99 ? '99+' : badge}</Text></View>
    ) : null}
  </Pressable>
);

export const call = (phone) => phone && Linking.openURL('tel:' + String(phone).replace(/[^\d+]/g, '')).catch(() => {});
export const sms = (phone) => phone && Linking.openURL('sms:' + String(phone).replace(/[^\d+]/g, '')).catch(() => {});

export const hapticSuccess = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const hapticError = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
export const hapticTap = () => Haptics.selectionAsync().catch(() => {});

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  btn: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  btnShadow: Platform.select({ ios: { shadowColor: colors.brand, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 } }),
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 13, minHeight: 50 },
  input: { flex: 1, fontSize: 15.5, color: colors.text, paddingHorizontal: 12, paddingVertical: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 6 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  rowLabel: { flex: 1, fontSize: 14.5, color: colors.text2 },
  rowValue: { fontSize: 14.5, color: colors.text, fontWeight: '600', maxWidth: '58%', textAlign: 'right' },
  errBanner: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errText: { flex: 1, color: '#991B1B', fontSize: 13.5 },
  errRetry: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#fff' },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 12, padding: 12, borderWidth: 1 },
  seg: { flexDirection: 'row', backgroundColor: '#E9EDF4', borderRadius: 13, padding: 4 },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  segActive: { backgroundColor: '#fff', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  segText: { fontSize: 13.5, fontWeight: '600', color: colors.muted },
  segCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#D8DEE8', alignItems: 'center', justifyContent: 'center' },
  fchip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, height: 36, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong },
  fchipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  fchipText: { fontSize: 13.5, fontWeight: '600', color: colors.text2 },
  fchipCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  chipText: { fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E9EDF4', alignItems: 'center', justifyContent: 'center' },
  navy: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingBottom: 18, overflow: 'hidden' },
  navyGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.brand, opacity: 0.32, top: -120, right: -80 },
  hIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  hBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.navy },
});
