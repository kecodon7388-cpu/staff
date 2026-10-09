import { getServer, getToken } from './storage';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let onUnauthorized = null;
/** Đăng ký hàm xử lý khi phiên hết hạn (401) → quay về màn hình đăng nhập */
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/** Gom thông báo lỗi từ { success:false, error } hoặc ASP.NET ProblemDetails { title, errors: { field: [msg] } } */
function errorMessage(data, status) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.error) return String(data.error);
  if (data.errors && typeof data.errors === 'object') {
    const msgs = [];
    Object.values(data.errors).forEach((v) => {
      if (Array.isArray(v)) v.forEach((m) => m && msgs.push(String(m)));
      else if (v) msgs.push(String(v));
    });
    if (msgs.length) return msgs.join('\n');
  }
  if (data.message && data.success === false) return String(data.message);
  if (data.title) return String(data.title);
  return null;
}

function statusMessage(status) {
  switch (status) {
    case 400: return 'Dữ liệu không hợp lệ';
    case 403: return 'Bạn không có quyền thực hiện chức năng này';
    case 404: return 'Không tìm thấy dữ liệu';
    case 413: return 'Tệp tải lên quá lớn';
    case 500: return 'Máy chủ gặp lỗi, vui lòng thử lại sau';
    case 502:
    case 503:
    case 504: return 'Máy chủ tạm thời không phản hồi, vui lòng thử lại sau';
    default: return `Lỗi máy chủ (${status})`;
  }
}

async function request(path, { method = 'GET', body, form, timeout = 20000, auth = true, server } = {}) {
  const base = server || (await getServer());
  const headers = { Accept: 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  let payload;
  if (form) payload = form; // FormData – để fetch tự đặt Content-Type (multipart boundary)
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(base + path, { method, headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    throw new ApiError(e?.name === 'AbortError'
      ? 'Máy chủ phản hồi quá lâu. Kiểm tra kết nối mạng.'
      : 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ.', 0);
  } finally { clearTimeout(timer); }

  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch { /* không phải JSON */ }

  if (res.status === 401 && auth) {
    onUnauthorized && onUnauthorized();
    throw new ApiError(errorMessage(data) || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
  }
  if (res.status === 429) throw new ApiError('Thao tác quá nhanh, vui lòng thử lại sau ít phút', 429);
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(errorMessage(data) || statusMessage(res.status), res.status);
  }
  return data || {};
}

const qs = (params) => {
  const parts = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v));
  return parts.length ? '?' + parts.join('&') : '';
};

/** Thêm danh sách ảnh vào FormData dưới khóa "files" (lặp khóa cho từng tệp) */
const appendFiles = (f, uris) => {
  (uris || []).forEach((uri, i) => {
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const name = `anh_${Date.now()}_${i + 1}.${ext.length <= 4 ? ext : 'jpg'}`;
    f.append('files', { uri, name, type: 'image/jpeg' });
  });
};

export const api = {
  // ---- Tài khoản
  login: (server, username, password, device) =>
    request('/api/shop/auth/login', { method: 'POST', body: { username, password, device }, auth: false, server }),
  logout: () => request('/api/shop/auth/logout', { method: 'POST', body: {} }),
  changePassword: (currentPassword, newPassword) => request('/api/shop/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
  me: () => request('/api/shop/me'),
  updateBank: (body) => request('/api/shop/profile/bank', { method: 'POST', body }),

  // ---- Danh mục
  lookups: () => request('/api/shop/lookups'),
  districts: (provinceId) => request('/api/shop/lookups/districts' + qs({ provinceId })),
  wards: (provinceId, districtId) => request('/api/shop/lookups/wards' + qs({ provinceId, districtId })),

  // ---- Sổ địa chỉ
  addresses: () => request('/api/shop/addresses'),
  saveAddress: (body) => request('/api/shop/addresses', { method: 'POST', body }),
  defaultAddress: (id) => request(`/api/shop/addresses/${id}/default`, { method: 'POST', body: {} }),
  deleteAddress: (id) => request(`/api/shop/addresses/${id}`, { method: 'DELETE' }),

  // ---- Đơn hàng
  quote: (body) => request('/api/shop/quote', { method: 'POST', body, timeout: 15000 }),
  orders: ({ tab, q, page = 1, pageSize = 30 } = {}) => request('/api/shop/orders' + qs({ tab, q, page, pageSize })),
  order: (id) => request('/api/shop/orders/' + id),
  orderByCode: (code) => request('/api/shop/orders/by-code/' + encodeURIComponent(code)),
  cloneData: (id) => request(`/api/shop/orders/${id}/clone`),
  createOrder: (body) => request('/api/shop/orders', { method: 'POST', body, timeout: 30000 }),
  confirmOrder: (id) => request(`/api/shop/orders/${id}/confirm`, { method: 'POST', body: {} }),
  cancelOrder: (id, body) => request(`/api/shop/orders/${id}/cancel`, { method: 'POST', body }),
  requestReturn: (id, body) => request(`/api/shop/orders/${id}/request-return`, { method: 'POST', body }),
  redeliver: (id, body) => request(`/api/shop/orders/${id}/redeliver`, { method: 'POST', body }),

  // ---- Tài chính
  cod: ({ status, q, page = 1 } = {}) => request('/api/shop/cod' + qs({ status, q, page })),
  settlements: (status) => request('/api/shop/settlements' + qs({ status })),
  settlement: (id) => request('/api/shop/settlements/' + id),
  confirmSettlement: (id) => request(`/api/shop/settlements/${id}/confirm`, { method: 'POST', body: {} }),
  debts: () => request('/api/shop/debts'),

  // ---- Khiếu nại
  complaints: (status) => request('/api/shop/complaints' + qs({ status })),
  complaint: (id) => request('/api/shop/complaints/' + id),
  createComplaint: ({ trackingCode, type, title, description, requestedAmount, photos }) => {
    const f = new FormData();
    if (trackingCode) f.append('trackingCode', trackingCode);
    if (type) f.append('type', type);
    f.append('title', title || '');
    f.append('description', description || '');
    f.append('requestedAmount', String(Math.round(Number(requestedAmount || 0))));
    appendFiles(f, photos);
    return request('/api/shop/complaints', { method: 'POST', form: f, timeout: 90000 });
  },
  commentComplaint: (id, { content, photos }) => {
    const f = new FormData();
    if (content) f.append('content', content);
    appendFiles(f, photos);
    return request(`/api/shop/complaints/${id}/comment`, { method: 'POST', form: f, timeout: 90000 });
  },

  // ---- Hàng hoàn
  returns: (status) => request('/api/shop/returns' + qs({ status })),
  confirmReturn: (id) => request(`/api/shop/returns/${id}/confirm`, { method: 'POST', body: {} }),

  // ---- Thông báo
  notifications: () => request('/api/shop/notifications'),
};
