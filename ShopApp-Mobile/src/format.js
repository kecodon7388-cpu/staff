const group = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** 1234000 → "1.234.000 đ" (giữ dấu âm) */
export const money = (v) => {
  const n = Math.round(Number(v || 0));
  return (n < 0 ? '-' : '') + group(Math.abs(n)) + ' đ';
};

/** Có dấu +/− phía trước (dùng cho công nợ) */
export const signedMoney = (v) => {
  const n = Math.round(Number(v || 0));
  return (n > 0 ? '+' : n < 0 ? '−' : '') + group(Math.abs(n)) + ' đ';
};

export const num = (v) => {
  const n = Math.round(Number(v || 0));
  return (n < 0 ? '-' : '') + group(Math.abs(n));
};

/** Rút gọn tiền cho thẻ thống kê: 1.250.000 → "1,25 tr" */
export const shortMoney = (v) => {
  const n = Number(v || 0);
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' tỷ';
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '').replace('.', ',') + ' tr';
  return money(n);
};

/** Chuỗi nhập tiền → số (bỏ mọi ký tự không phải số) */
export const parseMoney = (s) => Number(String(s || '').replace(/[^\d]/g, '')) || 0;

/** Định dạng khi đang gõ: "1234000" → "1.234.000" */
export const moneyInput = (s) => {
  const n = parseMoney(s);
  return n ? group(n) : '';
};

/** "1,5" / "1.5" → 1.5 */
export const parseDecimal = (s) => {
  const n = Number(String(s || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
};

const pad = (n) => (n < 10 ? '0' + n : '' + n);

/** dd/MM/yyyy HH:mm */
export const dt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** dd/MM/yyyy */
export const date = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** HH:mm dd/MM (gọn cho danh sách) */
export const shortDt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

/** yyyy-MM-dd theo giờ máy */
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

export const weekday = (d) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export const initials = (name) => (name || '?').trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase()).join('');

/** Số kg hiển thị: 0.5 → "0,5 kg" */
export const kg = (v) => (Number(v || 0)).toString().replace('.', ',') + ' kg';

const VN = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a'], [/[èéẹẻẽêềếệểễ]/g, 'e'], [/[ìíịỉĩ]/g, 'i'],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o'], [/[ùúụủũưừứựửữ]/g, 'u'], [/[ỳýỵỷỹ]/g, 'y'], [/đ/g, 'd'],
];
/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm */
export const fold = (s) => {
  let r = String(s || '').toLowerCase();
  VN.forEach(([re, ch]) => { r = r.replace(re, ch); });
  return r;
};
