import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

/**
 * Tải dữ liệu cho màn hình: tự tải lại khi màn hình được focus.
 * Trả về { data, error, loading, refreshing, reload, refresh, setData }.
 * fn phải ổn định (bọc useCallback với deps là bộ lọc).
 */
export function useLoad(fn, { focus = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const r = await fn();
      if (my === seq.current) { setData(r); setError(''); }
    } catch (e) {
      if (my === seq.current) setError(e.message || 'Có lỗi xảy ra');
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [fn]);

  const refresh = useCallback(async () => { setRefreshing(true); await reload(); setRefreshing(false); }, [reload]);

  useFocusEffect(useCallback(() => { if (focus) reload(); }, [focus, reload]));
  useEffect(() => { if (!focus) reload(); }, [focus, reload]);

  return { data, error, loading, refreshing, reload, refresh, setData };
}

/** Phân trang phía máy (máy chủ trả tối đa 50–300 dòng, không có tham số trang) */
export function usePaged(items, pageSize = 30) {
  const [n, setN] = useState(pageSize);
  useEffect(() => { setN(pageSize); }, [items, pageSize]);
  const list = items ? items.slice(0, n) : null;
  const more = !!items && items.length > n;
  const loadMore = useCallback(() => { if (more) setN((x) => x + pageSize); }, [more, pageSize]);
  return { list, more, loadMore, total: items ? items.length : 0 };
}

export const hapticOk = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const hapticErr = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

/** Hỏi xác nhận trước khi thực hiện (thao tác xóa / tiền) */
export const confirmAsk = (title, text, okText = 'Xác nhận', destructive = false) => new Promise((resolve) => {
  Alert.alert(title, text, [
    { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
    { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) });
});

/**
 * Chạy thao tác ghi: (tùy chọn) hỏi xác nhận → gọi API → rung + báo kết quả.
 * Trả về phản hồi hoặc null nếu hủy / lỗi.
 */
export function useAction() {
  const [busy, setBusy] = useState('');
  const run = useCallback(async (key, fn, { confirm, success = true, onDone } = {}) => {
    if (confirm) {
      const ok = await confirmAsk(confirm.title, confirm.text, confirm.ok, confirm.destructive);
      if (!ok) return null;
    }
    setBusy(key);
    try {
      const r = await fn();
      hapticOk();
      if (success && (r?.message || typeof success === 'string')) Alert.alert('Thành công', r?.message || success);
      if (onDone) await onDone(r);
      return r;
    } catch (e) {
      hapticErr();
      Alert.alert(e.status === 403 ? 'Không có quyền' : 'Không thực hiện được', e.message);
      return null;
    } finally { setBusy(''); }
  }, []);
  return { busy, run };
}
