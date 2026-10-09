import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { caseColor, colors, font, radius, shadow, statusColor } from '../theme';
import { digits, num } from '../format';

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
    outline: { bg: '#fff', fg: colors.text, border: colors.borderStrong },
    soft: { bg: colors.brand50, fg: colors.brand600, border: colors.brand100 },
    warning: { bg: colors.warning, fg: '#fff', border: colors.warning },
    dangerSolid: { bg: colors.danger, fg: '#fff', border: colors.danger },
    dark: { bg: colors.navy, fg: '#fff', border: colors.navy },
  }[variant];
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
          <Text style={{ color: v.fg, fontWeight: '700', fontSize: size === 'sm' ? 13 : 15.5 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Badge = ({ text, fg = colors.brand600, bg = colors.brand100, style }) => (
  <View style={[styles.badge, { backgroundColor: bg }, style]}><Text style={[styles.badgeText, { color: fg }]}>{text}</Text></View>
);

export const StatusBadge = ({ status, text }) => {
  const c = statusColor(status);
  return <Badge text={text} fg={c.fg} bg={c.bg} />;
};

export const IconCircle = ({ name, color = colors.brand, bg = colors.brand50, size = 40 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 3.2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={size * 0.5} color={color} />
  </View>
);

export function Field({ label, icon, right, style, inputStyle, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <Ionicons name={icon} size={18} color={colors.faint} style={{ marginLeft: 14 }} /> : null}
        <TextInput placeholderTextColor={colors.faint} style={[styles.input, inputStyle]} {...props} />
        {right}
      </View>
    </View>
  );
}

export const SectionTitle = ({ title, right, style }) => (
  <View style={[styles.sectionRow, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {right}
  </View>
);

export const Row = ({ icon, label, value, onPress, valueStyle, last }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={[styles.row, !last && styles.rowBorder]}>
    {icon ? <Ionicons name={icon} size={18} color={colors.muted} style={{ width: 26 }} /> : null}
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueStyle]} numberOfLines={2}>{value}</Text>
    {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
  </Pressable>
);

export const Empty = ({ icon = 'file-tray-outline', title, text }) => (
  <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
      <Ionicons name={icon} size={34} color={colors.faint} />
    </View>
    <Text style={[font.h3, { textAlign: 'center' }]}>{title}</Text>
    {text ? <Text style={[font.small, { textAlign: 'center', marginTop: 6 }]}>{text}</Text> : null}
  </View>
);

export const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}><ActivityIndicator size="large" color={colors.brand} /></View>
);

export function Segmented({ items, value, onChange }) {
  return (
    <View style={styles.seg}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} style={[styles.segItem, active && styles.segActive]}>
            <Text style={[styles.segText, active && { color: colors.text, fontWeight: '700' }]}>{it.label}</Text>
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

/** Nút tròn nhỏ: gọi điện / chỉ đường */
export const ActionChip = ({ icon, label, onPress, color = colors.brand }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.7 : 1 }]} hitSlop={6}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.chipText, { color }]}>{label}</Text>
  </Pressable>
);

export const call = (phone) => phone && Linking.openURL('tel:' + phone.replace(/[^\d+]/g, ''));
export const sms = (phone) => phone && Linking.openURL('sms:' + phone.replace(/[^\d+]/g, ''));
export const navigateTo = (address) => {
  if (!address) return;
  const q = encodeURIComponent(address);
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${q}` : `google.navigation:q=${q}`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`));
};


/** Badge cho mã trạng thái nghiệp vụ (bảng kê, phiếu nộp, đối soát, khiếu nại, hàng hoàn...) */
export const CaseBadge = ({ status, text, style }) => {
  const c = caseColor(status);
  return <Badge text={text || status} fg={c.fg} bg={c.bg} style={style} />;
};

/** Hộp lỗi có nút thử lại */
export const ErrorBox = ({ text, onRetry, style }) => (
  <View style={[styles.errBox, style]}>
    <Ionicons name="alert-circle" size={18} color={colors.danger} />
    <Text style={styles.errText}>{text}</Text>
    {onRetry ? <Pressable onPress={onRetry} hitSlop={8}><Text style={styles.errRetry}>Thử lại</Text></Pressable> : null}
  </View>
);

/** Trạng thái rỗng / lỗi / đang tải cho ListEmptyComponent */
export const ListState = ({ loading, error, onRetry, icon, title, text }) => {
  if (loading) return <View style={{ paddingVertical: 48 }}><ActivityIndicator size="large" color={colors.brand} /></View>;
  if (error) return <View style={{ padding: 16 }}><ErrorBox text={error} onRetry={onRetry} /></View>;
  return <Empty icon={icon} title={title} text={text} />;
};

/** Chân danh sách: "Xem thêm" khi phân trang phía máy */
export const ListFooter = ({ more, onMore, shown, total, note }) => {
  if (!total) return <View style={{ height: 24 }} />;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
      {more ? <Button title="Xem thêm" size="sm" variant="outline" icon="chevron-down" onPress={onMore} style={{ alignSelf: 'center', paddingHorizontal: 22 }} /> : null}
      <Text style={font.tiny}>Hiển thị {Math.min(shown, total)}/{total}{note ? ' · ' + note : ''}</Text>
    </View>
  );
};

/** Hàng chip lọc cuộn ngang */
export function Chips({ items, value, onChange, style }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable key={String(it.key)} onPress={() => onChange(it.key)} style={[styles.fchip, active && styles.fchipOn]}>
            {it.icon ? <Ionicons name={it.icon} size={14} color={active ? '#fff' : colors.text2} /> : null}
            <Text style={[styles.fchipText, active && { color: '#fff' }]}>{it.label}</Text>
            {it.count != null ? <Text style={[styles.fchipCount, active && { color: 'rgba(255,255,255,0.8)' }]}>{it.count}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Ô tìm kiếm (Enter để tìm) + nút quét tùy chọn */
export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Tìm kiếm', onScan, style, autoFocus }) {
  return (
    <View style={[styles.search, style]}>
      <Ionicons name="search" size={18} color={colors.faint} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint} style={styles.searchInput}
        returnKeyType="search" onSubmitEditing={onSubmit} autoCorrect={false} autoFocus={autoFocus} />
      {value ? <Pressable onPress={() => { onChangeText(''); if (onSubmit) setTimeout(() => onSubmit(''), 0); }} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.faint} /></Pressable> : null}
      {onScan ? <Pressable onPress={onScan} style={styles.searchScan} hitSlop={6}><Ionicons name="barcode-outline" size={21} color={colors.brand} /></Pressable> : <View style={{ width: 10 }} />}
    </View>
  );
}

/** Ô chọn (mở PickerModal / modal riêng) */
export const SelectField = ({ label, value, placeholder = 'Chọn', icon, onPress, style, disabled }) => (
  <View style={[{ marginBottom: 14 }, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.inputWrap, { opacity: disabled ? 0.55 : pressed ? 0.85 : 1 }]}>
      {icon ? <Ionicons name={icon} size={18} color={colors.faint} style={{ marginLeft: 14 }} /> : null}
      <Text style={[styles.input, { paddingVertical: 14, color: value ? colors.text : colors.faint }]} numberOfLines={1}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color={colors.faint} style={{ marginRight: 14 }} />
    </Pressable>
  </View>
);

/** Ô nhập số tiền (đ) có dấu chấm ngăn cách */
export const MoneyField = ({ value, onChange, label, ...props }) => (
  <Field label={label} icon="cash-outline" keyboardType="number-pad" value={value ? num(value) : ''}
    onChangeText={(t) => onChange(digits(t))} right={<Text style={{ marginRight: 14, color: colors.muted, fontWeight: '600' }}>đ</Text>} {...props} />
);

/** Dòng bật/tắt */
export const ToggleRow = ({ label, sub, value, onChange, last }) => (
  <View style={[styles.row, !last && styles.rowBorder]}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowLabel, { flex: 0 }]}>{label}</Text>
      {sub ? <Text style={font.tiny}>{sub}</Text> : null}
    </View>
    <Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.brand, false: '#CBD5E1' }} thumbColor="#fff" />
  </View>
);

/** Ô số liệu nhỏ (thẻ tóm tắt) */
export const Stat = ({ label, value, icon, color = colors.brand, bg = colors.brand50, onPress, alert, style }) => (
  <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.stat, alert && { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }, { opacity: pressed ? 0.85 : 1 }, style]}>
    {icon ? <View style={[styles.statIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={16} color={color} /></View> : null}
    <Text style={[styles.statValue, alert && { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>{value ?? '–'}</Text>
    <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
  </Pressable>
);

/** Ô chức năng (lưới trên trang chủ / trang phân hệ) */
export const Tile = ({ icon, label, sub, color = colors.brand, bg = colors.brand50, onPress, badge }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.88 : 1 }]}>
    <View style={[styles.tileIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={22} color={color} /></View>
    <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
    {sub ? <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text> : null}
    {badge ? <View style={styles.tileBadge}><Text style={styles.tileBadgeText}>{badge}</Text></View> : null}
  </Pressable>
);

/** Đầu trang màu navy cho các trang phân hệ (dùng trong tab, không có header native) */
export function NavyHeader({ title, sub, right, children, back, onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navy, { paddingTop: insets.top + 12 }]}>
      <View style={styles.navyGlow} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {back ? <Pressable onPress={onBack} hitSlop={10} style={styles.navyBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></Pressable> : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.navyTitle} numberOfLines={1}>{title}</Text>
          {sub ? <Text style={styles.navySub} numberOfLines={1}>{sub}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}
export const HeaderIconButton = ({ icon, onPress, badge, light = true }) => (
  <Pressable onPress={onPress} hitSlop={8} style={light ? styles.navyBtn : styles.lightBtn}>
    <Ionicons name={icon} size={21} color={light ? '#fff' : colors.text} />
    {badge ? <View style={styles.dotBadge}><Text style={styles.dotBadgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
  </Pressable>
);

/** Thanh nút cố định đáy màn hình */
export const BottomBar = ({ children, style }) => {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }, style]}>{children}</View>;
};

/** Bảng trượt từ đáy (form nhỏ: thanh toán, xử lý khiếu nại...) */
export function Sheet({ visible, title, onClose, children, footer }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHead}>
            <Text style={font.h3}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={24} color={colors.muted} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 8 }}>{children}</ScrollView>
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Biểu đồ cột dựng bằng View (không dùng thư viện chart) */
export function BarChart({ data, series, height = 140 }) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key] || 0))));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 4 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: height - 16 }}>
              {series.map((s) => {
                const v = Number(d[s.key] || 0);
                return <View key={s.key} style={{ width: 6, height: Math.max(v > 0 ? 3 : 1, (v / max) * (height - 18)), borderRadius: 3, backgroundColor: v > 0 ? s.color : '#E2E8F0' }} />;
              })}
            </View>
            <Text style={{ fontSize: 9, color: colors.faint, marginTop: 4 }} numberOfLines={1}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center' }}>
        {series.map((s) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Text style={font.small}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Thanh ngang tỉ lệ (VD đơn theo dịch vụ) */
export const HBar = ({ label, value, max, color = colors.brand, right }) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
      <Text style={{ fontSize: 13.5, color: colors.text2, flex: 1 }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>{right ?? value}</Text>
    </View>
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF2F7', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(2, Math.min(100, (Number(value || 0) / Math.max(1, max)) * 100))}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  </View>
);

/** Ô chọn (checkbox tròn) cho danh sách chọn nhiều */
export const Check = ({ on, size = 22 }) => (
  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={size} color={on ? colors.brand : colors.faint} />
);

/** Mở bản đồ tại tọa độ (Google Maps / Apple Maps) */
export const openMap = (lat, lng, label) => {
  if (lat == null || lng == null) return;
  const q = `${lat},${lng}`;
  const name = encodeURIComponent(label || 'Vị trí');
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?ll=${q}&q=${name}` : `geo:${q}?q=${q}(${name})`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  btn: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  btnShadow: Platform.select({ ios: { shadowColor: colors.brand, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 } }),
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text2, marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 13, minHeight: 50 },
  input: { flex: 1, fontSize: 15.5, color: colors.text, paddingHorizontal: 12, paddingVertical: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 6 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#EEF1F6' },
  rowLabel: { flex: 1, fontSize: 14.5, color: colors.text2 },
  rowValue: { fontSize: 14.5, color: colors.text, fontWeight: '600', maxWidth: '58%', textAlign: 'right' },
  seg: { flexDirection: 'row', backgroundColor: '#E9EDF4', borderRadius: 13, padding: 4 },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  segActive: { backgroundColor: '#fff', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  segText: { fontSize: 13.5, fontWeight: '600', color: colors.muted },
  segCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#D8DEE8', alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.brand50 },
  chipText: { fontSize: 13, fontWeight: '600' },
  errBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12 },
  errText: { flex: 1, color: '#991B1B', fontSize: 13.5, lineHeight: 19 },
  errRetry: { color: colors.brand600, fontWeight: '700', fontSize: 13.5 },
  fchip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, height: 34, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong },
  fchipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  fchipText: { fontSize: 13, fontWeight: '600', color: colors.text2 },
  fchipCount: { fontSize: 12, fontWeight: '700', color: colors.faint },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1F5F9', borderRadius: 13, paddingLeft: 12, height: 46 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  searchScan: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E2E8F0' },
  stat: { flexGrow: 1, flexBasis: '46%', backgroundColor: '#fff', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 1 },
  tile: { width: '31%', flexGrow: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: 13, borderWidth: 1, borderColor: colors.border, minHeight: 104, ...shadow },
  tileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileLabel: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  tileSub: { fontSize: 11.5, color: colors.faint, marginTop: 2 },
  tileBadge: { position: 'absolute', top: 10, right: 10, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  tileBadgeText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  navy: { backgroundColor: colors.navy, paddingHorizontal: 18, paddingBottom: 18, overflow: 'hidden' },
  navyGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.brand, opacity: 0.3, top: -150, right: -90 },
  navyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  navySub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  navyBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  lightBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  dotBadge: { position: 'absolute', top: -4, right: -4, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.navy },
  dotBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', marginBottom: 8 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
});
