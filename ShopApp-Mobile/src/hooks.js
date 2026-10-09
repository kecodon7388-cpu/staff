import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Tải dữ liệu từ API: trả về { data, loading, refreshing, error, reload, refresh, setData }.
 * - reload(): tải lại (hiện vòng xoay toàn màn hình nếu chưa có dữ liệu)
 * - refresh(): kéo để làm mới
 * - refetchOnFocus: tải lại im lặng mỗi khi quay lại màn hình
 */
export function useLoad(fn, deps = [], { refetchOnFocus = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const first = useRef(true);
  const seq = useRef(0);

  const run = useCallback(async (mode) => {
    const my = ++seq.current;
    if (mode === 'refresh') setRefreshing(true);
    else if (mode !== 'silent') setLoading(true);
    try {
      const res = await fnRef.current();
      if (my === seq.current) { setData(res); setError(''); }
    } catch (e) {
      if (my === seq.current) setError(e.message || 'Đã có lỗi xảy ra');
    } finally {
      if (my === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run('load'); }, deps);

  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    if (refetchOnFocus) run('silent');
  }, [refetchOnFocus, run]));

  const reload = useCallback(() => run('load'), [run]);
  const refresh = useCallback(() => run('refresh'), [run]);
  const silent = useCallback(() => run('silent'), [run]);
  return { data, loading, refreshing, error, reload, refresh, silent, setData };
}

/** Giá trị trễ (debounce) */
export function useDebounced(value, ms = 600) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
