import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SelectField } from './ui';
import PickerModal from './PickerModal';
import { getDistricts, getWards } from '../lookups';

/**
 * Chọn Tỉnh/Thành → Quận/Huyện → Phường/Xã.
 * value: { provinceId, districtId, wardId }; onChange(next)
 * provinces: danh sách tỉnh (từ lookups)
 */
export default function LocationPicker({ provinces, value, onChange, required, labelPrefix = '' }) {
  const v = value || {};
  const [open, setOpen] = useState(null); // 'p' | 'd' | 'w'
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingD, setLoadingD] = useState(false);
  const [loadingW, setLoadingW] = useState(false);

  useEffect(() => {
    let alive = true;
    setDistricts([]);
    if (!v.provinceId) return undefined;
    setLoadingD(true);
    getDistricts(v.provinceId).then((d) => alive && setDistricts(d)).catch(() => {}).finally(() => alive && setLoadingD(false));
    return () => { alive = false; };
  }, [v.provinceId]);

  useEffect(() => {
    let alive = true;
    setWards([]);
    if (!v.provinceId) return undefined;
    setLoadingW(true);
    getWards(v.provinceId, v.districtId).then((w) => alive && setWards(w)).catch(() => {}).finally(() => alive && setLoadingW(false));
    return () => { alive = false; };
  }, [v.provinceId, v.districtId]);

  const pName = (provinces || []).find((p) => p.id === v.provinceId)?.name;
  const dName = districts.find((d) => d.id === v.districtId)?.name;
  const wName = wards.find((w) => w.id === v.wardId)?.name;

  return (
    <View>
      <SelectField label={labelPrefix + 'Tỉnh / Thành phố'} required={required} icon="map-outline" value={pName}
        placeholder="Chọn tỉnh / thành phố" onPress={() => setOpen('p')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SelectField style={{ flex: 1 }} label="Quận / Huyện" value={dName} placeholder={loadingD ? 'Đang tải...' : 'Chọn'}
          disabled={!v.provinceId} onPress={() => setOpen('d')} />
        <SelectField style={{ flex: 1 }} label="Phường / Xã" value={wName} placeholder={loadingW ? 'Đang tải...' : 'Chọn'}
          disabled={!v.provinceId} onPress={() => setOpen('w')} />
      </View>

      <PickerModal visible={open === 'p'} title="Chọn tỉnh / thành phố" items={provinces} value={v.provinceId}
        searchPlaceholder="Tìm tỉnh / thành..." onClose={() => setOpen(null)}
        onSelect={(it) => { setOpen(null); if (it && it.id !== v.provinceId) onChange({ provinceId: it.id, districtId: null, wardId: null }); }} />
      <PickerModal visible={open === 'd'} title="Chọn quận / huyện" items={districts} value={v.districtId} loading={loadingD} allowClear
        searchPlaceholder="Tìm quận / huyện..." onClose={() => setOpen(null)}
        onSelect={(it) => { setOpen(null); const id = it ? it.id : null; if (id !== v.districtId) onChange({ ...v, districtId: id, wardId: null }); }} />
      <PickerModal visible={open === 'w'} title="Chọn phường / xã" items={wards} value={v.wardId} loading={loadingW} allowClear
        searchPlaceholder="Tìm phường / xã..." onClose={() => setOpen(null)}
        onSelect={(it) => { setOpen(null); onChange({ ...v, wardId: it ? it.id : null }); }} />
    </View>
  );
}
