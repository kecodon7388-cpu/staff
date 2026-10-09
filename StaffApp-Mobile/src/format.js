export const money = (v) => {
  const n = Math.round(Number(v || 0));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
};

export const num = (v) => Math.round(Number(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const pad = (n) => (n < 10 ? '0' + n : '' + n);

export const dt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

export const date = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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

/** Số tiền rút gọn: 1,2 tr / 350 N */
export const moneyShort = (v) => {
  const n = Math.round(Number(v || 0));
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',').replace(',0', '') + ' tỷ';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' tr';
  if (a >= 1e3) return Math.round(n / 1e3) + ' N';
  return String(n);
};

/** dd/MM/yyyy HH:mm */
export const dtFull = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "5 phút trước", "2 giờ trước", "3 ngày trước" */
export const ago = (iso) => {
  if (!iso) return 'chưa có';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const dd = Math.round(h / 24);
  return dd < 30 ? `${dd} ngày trước` : date(iso);
};

/** Trong vòng n phút gần đây? (online của shipper = vị trí trong 30 phút) */
export const within = (iso, minutes) => !!iso && !isNaN(new Date(iso)) && Date.now() - new Date(iso).getTime() <= minutes * 60000;

/** Chỉ giữ chữ số (ô nhập tiền) */
export const digits = (s) => String(s || '').replace(/[^\d]/g, '');

const ACCENTS = [
  [/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a'], [/[èéẹẻẽêềếệểễ]/g, 'e'], [/[ìíịỉĩ]/g, 'i'],
  [/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o'], [/[ùúụủũưừứựửữ]/g, 'u'], [/[ỳýỵỷỹ]/g, 'y'], [/đ/g, 'd'],
  [/[̀-ͯ]/g, ''],
];
/** Bỏ dấu tiếng Việt + chữ thường – để tìm kiếm không phân biệt dấu (không phụ thuộc String.normalize) */
export const fold = (s) => ACCENTS.reduce((acc, [re, to]) => acc.replace(re, to), String(s || '').toLowerCase()).trim();

/** Khớp từ khóa (bỏ dấu) với 1 hoặc nhiều trường */
export const matches = (query, ...fields) => {
  const k = fold(query);
  if (!k) return true;
  const hay = fold(fields.filter((x) => x != null).join(' '));
  return k.split(/\s+/).every((w) => hay.includes(w));
};

/** Ngày đầu tháng / cuối tháng (Date) */
export const monthStart = (d = new Date(), offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
export const monthEnd = (d = new Date(), offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
export const dayLabel = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
