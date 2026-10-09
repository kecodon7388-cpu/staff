/**
 * Phân hệ của CE Staff theo profile.modules (máy chủ trả theo quyền, thứ tự = ưu tiên):
 *   shipper, warehouse, dispatch, finance, complaints, returns, orders, dashboard
 * Thanh tab: "Trang chủ" + tối đa 3 tab vai trò + "Tài khoản".
 * Nhóm không đủ chỗ trên thanh tab → ô chức năng trên Trang chủ (mở trang phân hệ dạng stack).
 */
import { colors } from './theme';

export const MAX_ROLE_TABS = 3;

export const GROUPS = [
  {
    key: 'shipper', modules: ['shipper'], title: 'Shipper', sub: 'Lấy · giao · COD', icon: 'bicycle', color: colors.brand, bg: colors.brand100,
    tabs: [{ name: 'Tasks', title: 'Nhiệm vụ', icon: 'list' }, { name: 'Scan', title: 'Quét', icon: 'scan', scan: true }],
  },
  { key: 'warehouse', modules: ['warehouse'], title: 'Kho', sub: 'Quét · tồn · bảng kê', icon: 'cube', color: colors.info, bg: colors.infoBg, hub: 'WarehouseHub', tabs: [{ name: 'WarehouseTab', title: 'Kho', icon: 'cube' }] },
  { key: 'dispatch', modules: ['dispatch'], title: 'Điều phối', sub: 'Phân công shipper', icon: 'git-network', color: colors.violet, bg: colors.violetBg, hub: 'DispatchHub', tabs: [{ name: 'DispatchTab', title: 'Điều phối', icon: 'git-network' }] },
  { key: 'finance', modules: ['finance'], title: 'Tài chính', sub: 'COD · đối soát', icon: 'wallet', color: colors.success, bg: colors.successBg, hub: 'FinanceHub', tabs: [{ name: 'FinanceTab', title: 'Tài chính', icon: 'wallet' }] },
  { key: 'cases', modules: ['complaints', 'returns'], title: 'CSKH', sub: 'Khiếu nại · hàng hoàn', icon: 'chatbubbles', color: colors.warning, bg: colors.warningBg, hub: 'CasesHub', tabs: [{ name: 'CasesTab', title: 'CSKH', icon: 'chatbubbles' }] },
  { key: 'lookup', modules: ['orders', 'dashboard'], title: 'Tra cứu', sub: 'Vận đơn · dashboard', icon: 'search', color: colors.navy, bg: '#E2E8F0', hub: 'LookupHub', tabs: [{ name: 'LookupTab', title: 'Tra cứu', icon: 'search' }] },
];

/** Nhóm có mặt theo modules */
export const presentGroups = (modules) => GROUPS.filter((g) => g.modules.some((m) => (modules || []).includes(m)));

/** { tabs: [tab + group], tiles: [group không lên tab] } */
export function layout(modules) {
  const tabs = [];
  const tiles = [];
  for (const g of presentGroups(modules)) {
    if (tabs.length + g.tabs.length <= MAX_ROLE_TABS) g.tabs.forEach((t) => tabs.push({ ...t, group: g.key }));
    else tiles.push(g);
  }
  return { tabs, tiles };
}

/** Mở trang chính của 1 nhóm: nhảy sang tab nếu có, nếu không mở dạng stack */
export function openGroup(navigation, modules, key) {
  const { tabs } = layout(modules);
  const t = tabs.find((x) => x.group === key);
  if (t) { navigation.navigate('Main', { screen: t.name }); return; }
  const g = GROUPS.find((x) => x.key === key);
  if (g?.hub) navigation.navigate(g.hub);
}
