/**
 * Chọn ngày bằng lịch tháng dựng từ View (không dùng thư viện date picker native).
 * value / onChange: chuỗi 'yyyy-MM-dd'.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { isoDay } from '../format';
import { SelectField, Sheet } from './ui';

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const parse = (s) => { const [y, m, d] = String(s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : new Date(); };
const show = (s) => { if (!s) return ''; const d = parse(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

export default function DateField({ label, value, onChange, style, max }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parse(value));
  const sel = value ? isoDay(parse(value)) : null;
  const today = isoDay(new Date());

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // thứ Hai đầu tuần
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <>
      <SelectField label={label} icon="calendar-outline" value={show(value)} placeholder="Chọn ngày" style={style}
        onPress={() => { setCursor(parse(value)); setOpen(true); }} />
      <Sheet visible={open} title={label || 'Chọn ngày'} onClose={() => setOpen(false)}>
        <View style={styles.monthRow}>
          <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.nav}><Ionicons name="chevron-back" size={20} color={colors.text} /></Pressable>
          <Text style={styles.month}>Tháng {cursor.getMonth() + 1}/{cursor.getFullYear()}</Text>
          <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.nav}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Pressable>
        </View>
        <View style={styles.grid}>
          {WD.map((w) => <Text key={w} style={styles.wd}>{w}</Text>)}
          {cells.map((d, i) => {
            if (!d) return <View key={'e' + i} style={styles.cell} />;
            const k = isoDay(d);
            const on = k === sel;
            const disabled = max && k > max;
            return (
              <Pressable key={k} disabled={disabled} onPress={() => { onChange(k); setOpen(false); }} style={[styles.cell, on && styles.cellOn]}>
                <Text style={[styles.day, k === today && { color: colors.brand, fontWeight: '800' }, on && { color: '#fff' }, disabled && { color: '#CBD5E1' }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => { onChange(today); setOpen(false); }} style={styles.todayBtn}><Text style={styles.todayText}>Hôm nay</Text></Pressable>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nav: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  month: { fontSize: 16, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: colors.faint, fontWeight: '700', paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cellOn: { backgroundColor: colors.brand },
  day: { fontSize: 15, color: colors.text, fontWeight: '600' },
  todayBtn: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.brand50 },
  todayText: { color: colors.brand600, fontWeight: '700' },
});
