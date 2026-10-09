/**
 * Lớp gọi API duy nhất của CE Staff.
 *  - staff.*   → /api/staff   (mọi chức vụ: kho, điều phối, kế toán, CSKH, quản lý)
 *  - shipper.* → /api/shipper (phân hệ shipper – dùng CHUNG token đăng nhập từ /api/staff/auth/login)
 * Phản hồi máy chủ: { success, message, data } hoặc { success:false, error }.
 * Một số endpoint trả trường ở cấp gốc (items, counts, results...) → hàm trả nguyên object phản hồi.
 */
import { getServer, getToken } from './storage';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let onUnauthorized = null;
/** Đăng ký hàm xử lý khi phiên hết hạn (401) → quay về màn hình đăng nhập */
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const STATUS_TEXT = {
  400: 'Dữ liệu gửi lên không hợp lệ',
  403: 'Bạn không có quyền thực hiện chức năng này',
  404: 'Không tìm thấy dữ liệu',
  405: 'Máy chủ không hỗ trợ thao tác này (cần cập nhật máy chủ)',
  413: 'Tệp đính kèm quá lớn',
  415: 'Định dạng dữ liệu không được hỗ trợ',
  429: 'Thao tác quá nhanh, vui lòng thử lại sau ít phút',
  500: 'Máy chủ gặp lỗi, vui lòng thử lại sau',
  502: 'Máy chủ tạm thời không phản hồi',
  503: 'Máy chủ đang bảo trì, vui lòng thử lại sau',
};

/** Lỗi ModelState của ASP.NET ({ errors: { Field: [..] } }) → câu đọc được */
const modelStateText = (data) => {
  const errs = data && data.errors && typeof data.errors === 'object' ? Object.values(data.errors).flat().filter(Boolean) : [];
  return errs.length ? errs.slice(0, 3).join('; ') : null;
};

/** Ghép query string, bỏ qua giá trị rỗng */
export const qs = (params) => {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(typeof v === 'boolean' ? String(v) : v));
  return parts.length ? '?' + parts.join('&') : '';
};

/**
 * Gọi API. method + path ghi tường minh để script kiểm tra (scripts/verify.js) đối chiếu được với route C#.
 * opts: { query, body (JSON), form (FormData – multipart), timeout, auth, server }
 */
export async function call(method, path, { query, body, form, timeout = 20000, auth = true, server } = {}) {
  const base = server || (await getServer());
  const headers = { Accept: 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  let payload;
  if (form) payload = form; // FormData – để fetch tự đặt Content-Type (multipart boundary)
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  else if (method !== 'GET') { headers['Content-Type'] = 'application/json'; payload = '{}'; }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(base + path + qs(query), { method, headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    throw new ApiError(e?.name === 'AbortError'
      ? 'Máy chủ phản hồi quá lâu. Kiểm tra kết nối mạng.'
      : 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ.', 0);
  } finally { clearTimeout(timer); }

  let data = null;
  try { data = await res.json(); } catch { /* không phải JSON */ }
  if (res.status === 401 && auth) {
    onUnauthorized && onUnauthorized();
    throw new ApiError(data?.error || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
  }
  if (!res.ok || (data && data.success === false)) {
    const msg = data?.error || data?.message || modelStateText(data) || data?.title || STATUS_TEXT[res.status] || `Lỗi máy chủ (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data || { success: true };
}

/** Ảnh chọn từ ImagePicker → phần tử FormData */
const filePart = (uri, i = 0) => {
  const name = (uri.split('/').pop() || `anh_${i}.jpg`).split('?')[0];
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
  return { uri, name: name.includes('.') ? name : name + '.jpg', type };
};

// ============================= /api/staff =============================
export const staff = {
  // Đăng nhập & tài khoản
  login: (server, username, password, device) =>
    call('POST', '/api/staff/auth/login', { body: { username, password, device }, auth: false, server }),
  logout: () => call('POST', '/api/staff/auth/logout'),
  changePassword: (currentPassword, newPassword) => call('POST', '/api/staff/auth/password', { body: { currentPassword, newPassword } }),
  me: () => call('GET', '/api/staff/me'),

  // Danh mục
  lookups: () => call('GET', '/api/staff/lookups'),
  locations: (warehouseId) => call('GET', '/api/staff/lookups/locations', { query: { warehouseId } }),
  districts: (provinceId) => call('GET', '/api/staff/lookups/districts', { query: { provinceId } }),
  notifications: () => call('GET', '/api/staff/notifications'),

  // Tra cứu vận đơn
  searchOrders: ({ q, status } = {}) => call('GET', '/api/staff/orders', { query: { q, status } }),
  order: (id) => call('GET', `/api/staff/orders/${id}`),
  orderByCode: (code) => call('GET', `/api/staff/orders/by-code/${encodeURIComponent(code)}`),

  // ---- Kho ----
  whScan: ({ warehouseId, op, locationId, codes, note }) =>
    call('POST', '/api/staff/wh/scan', { body: { warehouseId, op, locationId, codes, note } }),
  whInventory: ({ warehouseId, overdue, q } = {}) =>
    call('GET', '/api/staff/wh/inventory', { query: { warehouseId, overdue: overdue ? true : undefined, q }, timeout: 30000 }),
  whManifests: ({ status, warehouseId } = {}) => call('GET', '/api/staff/wh/manifests', { query: { status, warehouseId } }),
  whCreateManifest: ({ type, fromWarehouseId, toWarehouseId, shipperId, note }) =>
    call('POST', '/api/staff/wh/manifests', { body: { type, fromWarehouseId, toWarehouseId, shipperId, note } }),
  whManifest: (id) => call('GET', `/api/staff/wh/manifests/${id}`),
  whManifestAdd: (id, { codes, autoRoute }) => call('POST', `/api/staff/wh/manifests/${id}/add`, { body: { codes: codes || [], autoRoute: !!autoRoute } }),
  whManifestRemove: (id, itemId) => call('POST', `/api/staff/wh/manifests/${id}/remove`, { body: { itemId } }),
  whManifestDispatch: (id) => call('POST', `/api/staff/wh/manifests/${id}/dispatch`),
  whManifestReceive: (id, codes) => call('POST', `/api/staff/wh/manifests/${id}/receive`, { body: { codes: codes || [] } }),
  whStocktake: ({ warehouseId, codes, record }) =>
    call('POST', '/api/staff/wh/stocktake', { body: { warehouseId, codes, record: !!record }, timeout: 40000 }),
  whIncidents: () => call('GET', '/api/staff/wh/incidents'),
  whCreateIncident: ({ code, type, warehouseId, note }) =>
    call('POST', '/api/staff/wh/incidents', { body: { code, type, warehouseId, note } }),

  // ---- Điều phối ----
  dispatchQueue: ({ tab, provinceId, districtId, unassignedOnly }) =>
    call('GET', '/api/staff/dispatch/queue', { query: { tab, provinceId, districtId, unassignedOnly } }),
  dispatchShippers: () => call('GET', '/api/staff/dispatch/shippers'),
  dispatchShipper: (id, date) => call('GET', `/api/staff/dispatch/shippers/${id}`, { query: { date } }),
  dispatchAssign: ({ ids, shipperId, type }) => call('POST', '/api/staff/dispatch/assign', { body: { ids, shipperId, type } }),
  dispatchAuto: (tab) => call('POST', '/api/staff/dispatch/auto', { query: { tab }, timeout: 60000 }),

  // ---- Tài chính ----
  finSummary: () => call('GET', '/api/staff/fin/summary'),
  finHolders: () => call('GET', '/api/staff/fin/holders'),
  finHolder: (shipperId) => call('GET', `/api/staff/fin/holders/${shipperId}`),
  finRemittances: (status) => call('GET', '/api/staff/fin/remittances', { query: { status } }),
  finRemittance: (id) => call('GET', `/api/staff/fin/remittances/${id}`),
  finCreateRemittance: ({ shipperId, ids, note }) => call('POST', '/api/staff/fin/remittances', { body: { shipperId, ids, note } }),
  finConfirmRemittance: (id) => call('POST', `/api/staff/fin/remittances/${id}/confirm`),
  finCancelRemittance: (id) => call('POST', `/api/staff/fin/remittances/${id}/cancel`),
  finSettlements: ({ status, q } = {}) => call('GET', '/api/staff/fin/settlements', { query: { status, q } }),
  finSettlement: (id) => call('GET', `/api/staff/fin/settlements/${id}`),
  finGenerate: ({ customerId, from, to, includeUnremitted }) =>
    call('POST', '/api/staff/fin/settlements/generate', { body: { customerId, from, to, includeUnremitted: !!includeUnremitted }, timeout: 40000 }),
  finConfirmSettlement: (id) => call('POST', `/api/staff/fin/settlements/${id}/confirm`),
  finCancelSettlement: (id) => call('POST', `/api/staff/fin/settlements/${id}/cancel`),
  finPaySettlement: (id, { method, bankRef, note }) => call('POST', `/api/staff/fin/settlements/${id}/pay`, { body: { method, bankRef, note } }),
  finCustomers: (q) => call('GET', '/api/staff/fin/customers', { query: { q } }),

  // ---- CSKH: khiếu nại ----
  complaints: ({ status, scope, q } = {}) => call('GET', '/api/staff/cases/complaints', { query: { status, scope, q } }),
  complaint: (id) => call('GET', `/api/staff/cases/complaints/${id}`),
  createComplaint: ({ trackingCode, customerId, type, title, description, requestedAmount, photos }) => {
    const f = new FormData();
    if (trackingCode) f.append('trackingCode', trackingCode);
    if (customerId) f.append('customerId', String(customerId));
    f.append('type', type || 'Other');
    f.append('title', title || '');
    f.append('description', description || '');
    f.append('requestedAmount', String(Math.round(Number(requestedAmount || 0))));
    (photos || []).forEach((uri, i) => f.append('files', filePart(uri, i)));
    return call('POST', '/api/staff/cases/complaints', { form: f, timeout: 90000 });
  },
  commentComplaint: (id, { content, isInternal, photos }) => {
    const f = new FormData();
    if (content) f.append('content', content);
    f.append('isInternal', isInternal ? 'true' : 'false');
    (photos || []).forEach((uri, i) => f.append('files', filePart(uri, i)));
    return call('POST', `/api/staff/cases/complaints/${id}/comment`, { form: f, timeout: 90000 });
  },
  processComplaint: (id, { op, assignTo, compensation, resolution }) =>
    call('POST', `/api/staff/cases/complaints/${id}/process`, { body: { op, assignTo, compensation, resolution } }),
  approveComplaint: (id, { approve, note }) => call('POST', `/api/staff/cases/complaints/${id}/approve`, { body: { approve: !!approve, note } }),

  // ---- CSKH: hàng hoàn ----
  returns: ({ status, q } = {}) => call('GET', '/api/staff/cases/returns', { query: { status, q } }),
  returnDetail: (id) => call('GET', `/api/staff/cases/returns/${id}`),
  updateReturn: (id, { op, shipperId, warehouseId, note }) =>
    call('POST', `/api/staff/cases/returns/${id}`, { body: { op, shipperId, warehouseId, note } }),

  // ---- Quản lý ----
  dashboard: () => call('GET', '/api/staff/dashboard', { timeout: 30000 }),
};

// ============================= /api/shipper =============================
// Giữ nguyên các hàm App CE Shipper cũ đã dùng; token là token đăng nhập CE Staff.
export const shipper = {
  login: (server, username, password, device) =>
    call('POST', '/api/shipper/auth/login', { body: { username, password, device }, auth: false, server }),
  logout: () => call('POST', '/api/shipper/auth/logout'),
  changePassword: (currentPassword, newPassword) => call('POST', '/api/shipper/auth/password', { body: { currentPassword, newPassword } }),
  me: () => call('GET', '/api/shipper/me'),
  tasks: (type) => call('GET', '/api/shipper/tasks', { query: { type } }),
  order: (id) => call('GET', `/api/shipper/orders/${id}`),
  orderByCode: (code) => call('GET', `/api/shipper/orders/by-code/${encodeURIComponent(code)}`),
  reasons: () => call('GET', '/api/shipper/reasons'),
  pickup: (id, note) => call('POST', `/api/shipper/orders/${id}/pickup`, { body: { note } }),
  pickupFail: (id, reason) => call('POST', `/api/shipper/orders/${id}/pickup-fail`, { body: { reason } }),
  startDelivery: (id) => call('POST', `/api/shipper/orders/${id}/start-delivery`),
  deliver: (id, { otp, recipientName, collected, photoUri, signature }) => {
    const f = new FormData();
    if (otp) f.append('otp', otp);
    if (recipientName) f.append('recipientName', recipientName);
    f.append('collected', String(Math.round(Number(collected || 0))));
    if (photoUri) f.append('photo', { uri: photoUri, name: 'proof.jpg', type: 'image/jpeg' });
    if (signature) f.append('signature', signature);
    return call('POST', `/api/shipper/orders/${id}/deliver`, { form: f, timeout: 60000 });
  },
  fail: (id, { reasonId, note, rescheduleDate }) =>
    call('POST', `/api/shipper/orders/${id}/fail`, { body: { reasonId, note, rescheduleDate } }),
  returnDone: (id) => call('POST', `/api/shipper/orders/${id}/return-done`),
  history: (date) => call('GET', '/api/shipper/history', { query: { date } }),
  cod: () => call('GET', '/api/shipper/cod'),
  location: (points) => call('POST', '/api/shipper/location', { body: points.map((p) => ({ lat: p.lat, lng: p.lng, at: p.at })), timeout: 15000 }),
};
