/**
 * Bộ nhớ đệm danh mục dùng chung (kho, shipper, tỉnh, nhân viên CSKH) – tải 1 lần mỗi phiên đăng nhập.
 */
import { useEffect, useState } from 'react';
import { staff } from './api';

let cache = null;
let pending = null;
const districtCache = {};
const locationCache = {};

export function clearLookups() {
  cache = null; pending = null;
  Object.keys(districtCache).forEach((k) => delete districtCache[k]);
  Object.keys(locationCache).forEach((k) => delete locationCache[k]);
}

export async function getLookups(force = false) {
  if (cache && !force) return cache;
  if (!pending || force) {
    pending = staff.lookups().then((r) => {
      cache = { warehouses: r.warehouses || [], shippers: r.shippers || [], provinces: r.provinces || [], staff: r.staff || [] };
      return cache;
    }).finally(() => { pending = null; });
  }
  return pending;
}

export async function getDistricts(provinceId) {
  if (!provinceId) return [];
  if (!districtCache[provinceId]) districtCache[provinceId] = (await staff.districts(provinceId)).items || [];
  return districtCache[provinceId];
}

export async function getLocations(warehouseId) {
  if (!warehouseId) return [];
  if (!locationCache[warehouseId]) locationCache[warehouseId] = (await staff.locations(warehouseId)).items || [];
  return locationCache[warehouseId];
}

/** Hook: { lookups, error } */
export function useLookups() {
  const [lookups, setLookups] = useState(cache);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    getLookups().then((l) => alive && setLookups(l)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);
  return { lookups, error };
}
