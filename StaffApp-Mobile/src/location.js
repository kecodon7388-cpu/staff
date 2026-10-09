/**
 * Gửi vị trí GPS của shipper khi bật "Đang làm việc" (chỉ dùng khi tài khoản có phân hệ "shipper").
 * - Ưu tiên chạy nền (Android: foreground service có thông báo; iOS: background location) – cần bản build (APK/IPA).
 * - Nếu không được phép chạy nền (VD: Expo Go) → theo dõi khi app đang mở.
 * - Điểm chưa gửi được (mất mạng) được lưu đệm và gửi lại lần sau.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { shipper } from './api';
import { kv } from './storage';

export const LOCATION_TASK = 'ce-staff-location';
const BUFFER_KEY = 'ce_gps_buffer';
const ON_KEY = 'ce_on_duty';
let watcher = null;
let flushing = false;

async function pushPoints(points) {
  const buf = (await kv.get(BUFFER_KEY, [])).concat(points).slice(-1000);
  await kv.set(BUFFER_KEY, buf);
  if (flushing) return;
  flushing = true;
  try {
    const all = await kv.get(BUFFER_KEY, []);
    if (all.length) {
      await shipper.location(all);
      await kv.set(BUFFER_KEY, []);
    }
  } catch { /* giữ lại trong bộ đệm */ } finally { flushing = false; }
}

const toPoints = (locations) => (locations || []).map((l) => ({
  lat: l.coords.latitude, lng: l.coords.longitude, at: new Date(l.timestamp || Date.now()).toISOString(),
}));

// Bắt buộc định nghĩa task ở cấp module (được import trong App.js)
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  await pushPoints(toPoints(data.locations));
});

export async function isOnDuty() { return !!(await kv.get(ON_KEY, false)); }

/** Trả về 'background' | 'foreground' */
export async function startTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Cần cho phép truy cập vị trí để bật chế độ làm việc');
  await kv.set(ON_KEY, true);
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status === 'granted') {
      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
      if (!started) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000,
          distanceInterval: 50,
          deferredUpdatesInterval: 60000,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'CE Staff – đang làm việc',
            notificationBody: 'Đang chia sẻ vị trí với điều phối viên',
            notificationColor: '#2563EB',
          },
        });
      }
      return 'background';
    }
  } catch { /* Expo Go hoặc chưa cấp quyền nền → dùng chế độ khi mở app */ }
  await startForegroundWatch();
  return 'foreground';
}

async function startForegroundWatch() {
  if (watcher) return;
  watcher = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 50 },
    (loc) => pushPoints(toPoints([loc]))
  );
}

/** Gọi khi mở app: nếu đang bật làm việc mà không có task nền thì theo dõi khi mở app */
export async function resumeTracking() {
  if (!(await isOnDuty())) return null;
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (started) return 'background';
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return null;
  await startForegroundWatch();
  return 'foreground';
}

export async function stopTracking() {
  await kv.set(ON_KEY, false);
  if (watcher) { watcher.remove(); watcher = null; }
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

/** Gửi ngay vị trí hiện tại (VD: khi xác nhận giao hàng) */
export async function sendCurrentPosition() {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') return;
    const loc = await Location.getLastKnownPositionAsync() || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    if (loc) await pushPoints(toPoints([loc]));
  } catch { /* bỏ qua */ }
}
