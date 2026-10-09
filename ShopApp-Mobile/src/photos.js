import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const OPTS = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false, exif: false };

async function fromCamera() {
  const p = await ImagePicker.requestCameraPermissionsAsync();
  if (!p.granted) { Alert.alert('Chưa có quyền camera', 'Vui lòng cấp quyền camera trong Cài đặt để chụp ảnh.'); return []; }
  const r = await ImagePicker.launchCameraAsync(OPTS);
  return r.canceled ? [] : (r.assets || []).map((a) => a.uri);
}

async function fromLibrary(max) {
  const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!p.granted) { Alert.alert('Chưa có quyền thư viện ảnh', 'Vui lòng cấp quyền truy cập ảnh trong Cài đặt.'); return []; }
  const r = await ImagePicker.launchImageLibraryAsync({ ...OPTS, allowsMultipleSelection: max > 1, selectionLimit: max });
  return r.canceled ? [] : (r.assets || []).map((a) => a.uri).slice(0, max);
}

/** Hỏi người dùng chụp ảnh hoặc chọn từ thư viện → trả về mảng uri (tối đa `max`) */
export function pickPhotos(max = 1) {
  return new Promise((resolve) => {
    Alert.alert('Đính kèm ảnh', 'Chọn nguồn ảnh', [
      { text: 'Chụp ảnh', onPress: () => fromCamera().then(resolve).catch(() => resolve([])) },
      { text: 'Chọn từ thư viện', onPress: () => fromLibrary(max).then(resolve).catch(() => resolve([])) },
      { text: 'Hủy', style: 'cancel', onPress: () => resolve([]) },
    ], { cancelable: true, onDismiss: () => resolve([]) });
  });
}
