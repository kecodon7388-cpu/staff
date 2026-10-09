import { Platform } from 'react-native';

export const colors = {
  brand: '#2563EB',
  brand600: '#1D4ED8',
  brand50: '#EFF6FF',
  brand100: '#DBEAFE',
  navy: '#0F172A',
  navy2: '#13213F',
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  border: '#E6EAF1',
  borderStrong: '#D5DBE5',
  text: '#0F172A',
  text2: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#0891B2',
  infoBg: '#CFFAFE',
  violet: '#7C3AED',
  violetBg: '#EDE9FE',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const space = (n) => n * 4;

export const shadow = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
  default: {},
});

export const shadowLg = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  android: { elevation: 8 },
  default: {},
});

export const font = {
  h1: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.text2 },
  small: { fontSize: 13, color: colors.muted },
  tiny: { fontSize: 11.5, color: colors.faint },
};

/** Màu theo trạng thái vận đơn (khớp OrderStatus phía máy chủ) */
export const statusColor = (status) => {
  switch (status) {
    case 'AwaitingPickup': return { fg: colors.info, bg: colors.infoBg };
    case 'Delivering': return { fg: colors.brand600, bg: colors.brand100 };
    case 'Delivered': return { fg: colors.success, bg: colors.successBg };
    case 'DeliveryFailed': return { fg: colors.danger, bg: colors.dangerBg };
    case 'Rescheduled':
    case 'Returning': return { fg: colors.warning, bg: colors.warningBg };
    case 'Returned': return { fg: '#334155', bg: '#E2E8F0' };
    case 'Cancelled': return { fg: colors.danger, bg: colors.dangerBg };
    default: return { fg: colors.violet, bg: colors.violetBg };
  }
};

export const taskTypeMeta = {
  pickup: { label: 'Lấy hàng', icon: 'cube-outline', color: colors.info, bg: colors.infoBg },
  delivery: { label: 'Giao hàng', icon: 'bicycle-outline', color: colors.brand, bg: colors.brand100 },
  return: { label: 'Trả hoàn', icon: 'return-down-back-outline', color: colors.warning, bg: colors.warningBg },
};

const TONES = {
  success: { fg: colors.success, bg: colors.successBg },
  warning: { fg: colors.warning, bg: colors.warningBg },
  danger: { fg: colors.danger, bg: colors.dangerBg },
  info: { fg: colors.info, bg: colors.infoBg },
  brand: { fg: colors.brand600, bg: colors.brand100 },
  violet: { fg: colors.violet, bg: colors.violetBg },
  muted: { fg: '#475569', bg: '#E2E8F0' },
};
export const tone = (name) => TONES[name] || TONES.muted;

/**
 * Màu badge theo mã trạng thái (chuỗi enum từ máy chủ): bảng kê, phiếu nộp, đối soát, khiếu nại, hàng hoàn, COD.
 * Mã trùng tên giữa các enum (Confirmed, Cancelled...) dùng chung một màu.
 */
const STATUS_TONE = {
  // ManifestStatus
  Open: 'info', Dispatched: 'brand', Received: 'success',
  // RemittanceStatus / SettlementStatus
  Draft: 'warning', Confirmed: 'success', Paid: 'success', Cancelled: 'muted',
  // ComplaintStatus
  New: 'violet', Assigned: 'info', Processing: 'brand', WaitingApproval: 'warning', Approved: 'success', Rejected: 'danger', Closed: 'muted',
  // ReturnStatus
  Pending: 'warning', AtReturnWarehouse: 'info', ReturnedToShop: 'success',
  // CodStatus
  None: 'muted', CollectedByShipper: 'warning', RemittedToCompany: 'info', Settled: 'brand', PaidToShop: 'success',
  // InventoryTxType (sự cố)
  Lost: 'danger', Damaged: 'warning', Found: 'success',
  // AssignmentStatus
  Completed: 'success', Failed: 'danger', Reassigned: 'muted',
};
export const caseColor = (code) => (STATUS_TONE[code] ? tone(STATUS_TONE[code]) : statusColor(code));
