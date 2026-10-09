/**
 * Ô chọn + PickerModal gói sẵn, và các ô chọn danh mục hay dùng (kho, vị trí, shipper, tỉnh, quận).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { colors } from '../theme';
import { getDistricts, getLocations, useLookups } from '../lookups';
import { kv } from '../storage';
import PickerModal from './PickerModal';
import { SelectField } from './ui';

export default function PickField({
  label, title, items, value, onChange, getKey = (i) => i.id, getLabel = (i) => i.name, getSub, getSearch,
  placeholder = 'Chọn', icon, allowClear, clearText, renderRight, loading, error, style, disabled, onSearch, emptyText,
}) {
  const [open, setOpen] = useState(false);
  const cur = (items || []).find((i) => String(getKey(i)) === String(value));
  return (
    <>
      <SelectField label={label} icon={icon} value={cur ? getLabel(cur) : ''} placeholder={placeholder} onPress={() => setOpen(true)} style={style} disabled={disabled} />
      <PickerModal visible={open} title={title || label} items={items} onClose={() => setOpen(false)} onSelect={onChange}
        getKey={getKey} getLabel={getLabel} getSub={getSub} getSearch={getSearch} selectedKey={value} renderRight={renderRight}
        allowClear={allowClear} clearText={clearText} loading={loading} error={error} onSearch={onSearch} emptyText={emptyText} />
    </>
  );
}

const whLabel = (w) => `${w.code} · ${w.name}`;
const WH_TYPES = { PostOffice: 'Bưu cục', Hub: 'Hub trung chuyển', Warehouse: 'Kho', ReturnWarehouse: 'Kho hàng hoàn' };

/** Chọn kho. remember = khóa lưu kho đã chọn gần nhất (tự chọn lại lần sau / chọn kho của chi nhánh mình) */
export function WarehouseField({ value, onChange, label = 'Kho', remember, allowClear, exclude, style, clearText = 'Tất cả kho' }) {
  const { lookups, error } = useLookups();
  const list = (lookups?.warehouses || []).filter((w) => w.id !== exclude);
  // Tự chọn lại kho dùng gần nhất (hoặc kho thuộc chi nhánh mình) – chỉ chạy 1 lần khi danh mục tải xong
  const autoPicked = useRef(false);
  useEffect(() => {
    if (!remember || value || !lookups || autoPicked.current) return;
    autoPicked.current = true;
    (async () => {
      const saved = await kv.get('wh_' + remember, null);
      const pick = list.find((w) => w.id === saved) || list.find((w) => w.mine) || (allowClear ? null : list[0]);
      if (pick) onChange(pick);
    })();
  }, [lookups, remember, value, list, allowClear, onChange]);
  return (
    <PickField label={label} title="Chọn kho" items={list} value={value} icon="business-outline" allowClear={allowClear} clearText={clearText}
      getLabel={whLabel} getSub={(w) => [WH_TYPES[w.type] || w.type, w.mine ? 'Chi nhánh của tôi' : ''].filter(Boolean).join(' · ')}
      onChange={(w) => { onChange(w); if (remember && w) kv.set('wh_' + remember, w.id); }} loading={!lookups} error={error} style={style} />
  );
}

/** Chọn vị trí trong kho (kệ / ô) */
export function LocationField({ warehouseId, value, onChange, label = 'Vị trí (kệ / ô)', style }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setItems(null); setError('');
    if (!warehouseId) { setItems([]); return; }
    getLocations(warehouseId).then(setItems).catch((e) => { setItems([]); setError(e.message); });
  }, [warehouseId]);
  return (
    <PickField label={label} title="Chọn vị trí" items={items} value={value} icon="grid-outline" allowClear clearText="Không chọn vị trí"
      getLabel={(l) => l.code} getSub={(l) => l.description} onChange={onChange} loading={items == null} error={error}
      placeholder={items && items.length === 0 ? 'Kho chưa khai báo vị trí' : 'Không chọn vị trí'} disabled={!warehouseId} style={style}
      emptyText="Kho chưa khai báo vị trí" />
  );
}

/** Chọn shipper từ danh mục (lookups) */
export function ShipperField({ value, onChange, label = 'Shipper', style }) {
  const { lookups, error } = useLookups();
  return (
    <PickField label={label} title="Chọn shipper" items={lookups?.shippers} value={value} icon="bicycle-outline"
      getLabel={(s) => `${s.name} (${s.code})`} getSub={(s) => s.phone} onChange={onChange} loading={!lookups} error={error} style={style} />
  );
}

/** Chọn tỉnh + quận */
export function AreaFields({ provinceId, districtId, onChange }) {
  const { lookups } = useLookups();
  const [districts, setDistricts] = useState([]);
  useEffect(() => { setDistricts([]); if (provinceId) getDistricts(provinceId).then(setDistricts).catch(() => setDistricts([])); }, [provinceId]);
  return (
    <>
      <PickField label="Tỉnh / thành" title="Chọn tỉnh / thành" items={lookups?.provinces} value={provinceId} icon="map-outline" allowClear clearText="Tất cả tỉnh"
        placeholder="Tất cả tỉnh" onChange={(p) => onChange({ provinceId: p?.id || null, districtId: null })} loading={!lookups} />
      <PickField label="Quận / huyện" title="Chọn quận / huyện" items={districts} value={districtId} icon="location-outline" allowClear clearText="Tất cả quận"
        placeholder={provinceId ? 'Tất cả quận' : 'Chọn tỉnh trước'} disabled={!provinceId} onChange={(d) => onChange({ provinceId, districtId: d?.id || null })} />
    </>
  );
}

export const Hint = ({ children }) => <Text style={{ fontSize: 12.5, color: colors.muted, marginTop: -6, marginBottom: 12 }}>{children}</Text>;
