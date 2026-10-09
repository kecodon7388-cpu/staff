# CE Shop – App chủ shop cho Android & iOS (React Native · Expo SDK 52)

App dành cho khách hàng (chủ shop / nhân viên shop) của Courier Express: **Tạo đơn · Theo dõi · Đối soát COD**.
App gọi API `/api/shop/*` của máy chủ Courier Express (`Controllers/Api/ShopApiController.cs`, `ShopApiController.Orders.cs`).
Đăng nhập cấp token là một phiên trong bảng `LoginSessions` (thu hồi được tại *Người dùng → Phiên đăng nhập*).

## Tính năng

- **Trang chủ**: lời chào, chuông thông báo (số chưa đọc), số đơn theo trạng thái (bấm để mở tab đơn tương ứng),
  tiền COD (shipper đang giữ, chờ đối soát, đã nhận trong tháng, số dư công nợ), chỉ số tháng, biểu đồ 7 ngày,
  đơn cần xử lý, thông báo hệ thống, cảnh báo khi chưa có địa chỉ lấy hàng, thao tác nhanh.
- **Đơn hàng**: tab theo trạng thái kèm số lượng, tìm theo mã vận đơn / SĐT / tên, cuộn vô hạn, kéo để làm mới, quét mã.
- **Chi tiết đơn**: hành trình, người gửi / nhận (gọi, nhắn tin), hàng hóa, bảng cước chi tiết, shipper đang lấy / giao,
  ảnh giao hàng & chữ ký, hàng hoàn, khiếu nại, phiên đối soát; thao tác *Chốt đơn, Hủy đơn, Giao lại, Hoàn hàng,
  Khiếu nại, Nhân bản*; chia sẻ mã vận đơn.
- **Tạo đơn** (nút + ở giữa): chọn địa chỉ lấy hàng từ sổ hoặc nhập người gửi, chọn Tỉnh → Quận → Phường có tìm kiếm,
  dịch vụ, khối lượng, kích thước, giá trị khai báo, COD, người trả cước, dễ vỡ, lấy tận nơi, ghi chú, mã đơn shop;
  **tính cước trực tiếp** (thanh dưới cùng); *Lưu nháp* hoặc *Tạo & chốt đơn*.
- **Tài chính**: COD theo trạng thái, phiên đối soát (xem chi tiết & xác nhận), sổ công nợ và lịch sử thanh toán.
- **Khiếu nại**: danh sách, chi tiết dạng trò chuyện với CSKH (gửi kèm ảnh), gửi khiếu nại mới (tối đa 5 ảnh, quét mã đơn).
- **Hàng hoàn**: lọc theo trạng thái, xác nhận *Đã nhận hàng*.
- **Tài khoản**: thông tin shop, tài khoản nhận tiền COD (chủ shop đổi được, cần mật khẩu), sổ địa chỉ,
  đổi mật khẩu, hotline, đăng xuất.

## 1. Chạy thử bằng Expo Go (không cần build)

1. Cài **Node.js 20+**; trên điện thoại cài **Expo Go** (CH Play / App Store).
2. Chạy máy chủ web ở chế độ mạng LAN, lắng nghe `http://0.0.0.0:5180`, **tắt chuyển hướng HTTPS**:
   ```bash
   dotnet run --urls http://0.0.0.0:5180 --Https:Redirect=false
   ```
   (hoặc dùng profile LAN có sẵn). Máy tính và điện thoại cùng Wi-Fi; mở tường lửa Windows cho cổng 5180.
3. Trong thư mục `ShopApp-Mobile`:
   ```bash
   npm install
   npx expo install --fix      # căn chỉnh phiên bản thư viện theo Expo SDK (nếu cần)
   npx expo start
   ```
   Quét QR bằng Expo Go (Android) hoặc Camera (iPhone).
4. Màn hình đăng nhập → bấm **Máy chủ** → nhập `http://<IP-máy-tính>:5180`.

### Tài khoản demo

| Tài khoản | Mật khẩu | Ghi chú |
|---|---|---|
| `shopdemo` | theo dữ liệu seed (mặc định `123456`) | Chủ shop demo; `shopnv` là nhân viên shop |
| `shophoahong`, `shopnhaxinh`, `shoptechzone`, `shopnongsan` | `123456` | Các shop demo 901–904 (có sau khi chạy `03_demo_data.sql`) |

Tài khoản nhân viên nội bộ (shipper, kế toán...) **không** đăng nhập được App Shop.

## 2. Build file cài đặt – EAS Build (đám mây)

```bash
npm install -g eas-cli
eas login
eas build:configure             # lần đầu
npm run build:apk               # APK Android cài trực tiếp (profile "preview")
npm run build:android           # AAB đưa lên Google Play
npm run build:ios               # iOS – cần tài khoản Apple Developer
```

## 2b. Build APK miễn phí bằng GitHub Actions

Workflow build tìm thư mục app theo `package.json` có `"name": "courier-express-shop"`.
1. Đẩy toàn bộ dự án lên GitHub (gồm thư mục `.github/workflows`).
2. Tab **Actions** → chọn workflow build App Shop → **Run workflow** → (tùy chọn) nhập địa chỉ máy chủ mặc định.
3. Chờ 15–20 phút → mục **Artifacts** → tải file APK, chép vào điện thoại để cài.

APK ký bằng khóa debug, dùng để cài thử.

## 3. Cấu hình

| Mục | File | Ghi chú |
|---|---|---|
| Máy chủ mặc định | `app.json` → `expo.extra.defaultServerUrl` | Đổi được ngay trên màn hình đăng nhập |
| Tên app / mã định danh | `app.json` → `name`, `ios.bundleIdentifier`, `android.package` (`com.courierexpress.shop`) | |
| Icon / splash | `assets/*.png` | Màu chủ đạo teal `#0D9488` |
| Cho phép HTTP trong LAN | `app.json` → `NSAllowsArbitraryLoads`, `expo-build-properties.usesCleartextTraffic` | Dùng HTTPS khi triển khai thật |

## 4. Cấu trúc mã nguồn

```
App.js                    Điều hướng: Stack + Bottom Tabs (Trang chủ · Đơn hàng · + · Tài chính · Tài khoản)
src/api.js                Gọi API (timeout, xử lý lỗi, 401 → đăng xuất, multipart)
src/auth.js               AuthProvider (đăng nhập / đăng xuất / hồ sơ)
src/storage.js            Token (SecureStore), địa chỉ máy chủ & hồ sơ (AsyncStorage)
src/lookups.js            Bộ nhớ tạm danh mục (dịch vụ, tỉnh, quận, phường, lý do)
src/components/           ui.js, PickerModal, LocationPicker, OrderCard
src/screens/              Các màn hình
```
