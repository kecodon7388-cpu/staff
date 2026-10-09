import { Platform } from 'react-native';

export const colors = {
  brand: '#0D9488',
  brand600: '#0F766E',
  brand50: '#F0FDFA',
  brand100: '#CCFBF1',
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
  blue: '#2563EB',
  blueBg: '#DBEAFE',
  violet: '#7C3AED',
  violetBg: '#EDE9FE',
  slate: '#334155',
  slateBg: '#E2E8F0',
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

const C = (fg, bg) => ({ fg, bg });

/** Màu theo trạng thái vận đơn (khớp enum OrderStatus phía máy chủ) */
export const statusColor = (status) => {
  switch (status) {
    case 'Created': return C(colors.slate, colors.slateBg);
    case 'AwaitingPickup': return C(colors.info, colors.infoBg);
    case 'PickedUp':
    case 'InWarehouse':
    case 'Sorting':
    case 'InTransit':
    case 'ArrivedDestination': return C(colors.violet, colors.violetBg);
    case 'Delivering': return C(colors.blue, colors.blueBg);
    case 'Delivered': return C(colors.success, colors.successBg);
    case 'DeliveryFailed': return C(colors.danger, colors.dangerBg);
    case 'Rescheduled':
    case 'Returning': return C(colors.warning, colors.warningBg);
    case 'Returned': return C(colors.slate, colors.slateBg);
    case 'Cancelled': return C(colors.danger, colors.dangerBg);
    default: return C(colors.brand600, colors.brand100);
  }
};

/** Màu trạng thái COD (CodStatus) */
export const codColor = (status) => {
  switch (status) {
    case 'Pending': return C(colors.slate, colors.slateBg);
    case 'CollectedByShipper': return C(colors.warning, colors.warningBg);
    case 'RemittedToCompany': return C(colors.info, colors.infoBg);
    case 'Settled': return C(colors.violet, colors.violetBg);
    case 'PaidToShop': return C(colors.success, colors.successBg);
    default: return C(colors.muted, '#EEF2F7');
  }
};

/** Màu trạng thái chung cho đối soát / khiếu nại / hàng hoàn */
export const genericColor = (status) => {
  switch (status) {
    // SettlementStatus
    case 'Draft': return C(colors.warning, colors.warningBg);
    case 'Confirmed': return C(colors.info, colors.infoBg);
    case 'Paid': return C(colors.success, colors.successBg);
    // ComplaintStatus
    case 'New': return C(colors.blue, colors.blueBg);
    case 'Assigned':
    case 'Processing': return C(colors.violet, colors.violetBg);
    case 'WaitingApproval': return C(colors.warning, colors.warningBg);
    case 'Approved': return C(colors.success, colors.successBg);
    case 'Rejected': return C(colors.danger, colors.dangerBg);
    case 'Closed': return C(colors.slate, colors.slateBg);
    // ReturnStatus
    case 'Pending': return C(colors.slate, colors.slateBg);
    case 'Returning': return C(colors.warning, colors.warningBg);
    case 'AtReturnWarehouse': return C(colors.violet, colors.violetBg);
    case 'ReturnedToShop': return C(colors.info, colors.infoBg);
    case 'Cancelled': return C(colors.danger, colors.dangerBg);
    default: return C(colors.brand600, colors.brand100);
  }
};
