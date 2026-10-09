import { api } from './api';

// Bộ nhớ tạm danh mục (dịch vụ, tỉnh thành, lý do, loại khiếu nại) – tải 1 lần mỗi phiên
let cache = null;
let pending = null;
const districtCache = {};
const wardCache = {};

export async function getLookups(force = false) {
  if (cache && !force) return cache;
  if (pending && !force) return pending;
  pending = api.lookups().then((res) => {
    cache = {
      services: res.services || [],
      provinces: res.provinces || [],
      cancelReasons: res.cancelReasons || [],
      returnReasons: res.returnReasons || [],
      complaintTypes: res.complaintTypes || [],
    };
    return cache;
  }).finally(() => { pending = null; });
  return pending;
}

export async function getDistricts(provinceId) {
  if (!provinceId) return [];
  if (districtCache[provinceId]) return districtCache[provinceId];
  const res = await api.districts(provinceId);
  districtCache[provinceId] = res.items || [];
  return districtCache[provinceId];
}

export async function getWards(provinceId, districtId) {
  if (!provinceId) return [];
  const key = provinceId + ':' + (districtId || '');
  if (wardCache[key]) return wardCache[key];
  const res = await api.wards(provinceId, districtId || undefined);
  wardCache[key] = res.items || [];
  return wardCache[key];
}

export function clearLookups() { cache = null; }
