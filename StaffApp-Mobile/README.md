# CE Staff – App nhân viên Courier Express (Android & iOS)

Ứng dụng di động **dùng chung cho mọi chức vụ** nội bộ: shipper, nhân viên/quản lý kho, điều phối, kế toán, CSKH, quản lý.
Viết bằng **React Native + Expo SDK 52** (một mã nguồn chạy Android và iOS). CE Staff **thay thế App CE Shipper**: tài khoản shipper
đăng nhập CE Staff có đầy đủ chức năng như app cũ (nhiệm vụ, quét mã, giao hàng, OTP / ảnh / chữ ký, báo thất bại, COD, lịch sử, GPS chạy nền).

Sau khi đăng nhập (`POST /api/staff/auth/login`), máy chủ trả `profile.modules` theo quyền của tài khoản; app **chỉ hiện các phân hệ được cấp**.
Mọi nghiệp vụ gọi lại đúng các service mà trang quản trị web đang dùng → số liệu trên app và web luôn giống nhau.

## 1. Ai thấy gì

| Module (máy chủ trả) | Điều kiện quyền | Màn hình trên app |
|---|---|---|
| `shipper` | Tài khoản gắn với hồ sơ Shipper đang hoạt động | Tab **Nhiệm vụ** (lấy / giao / trả hoàn), tab **Quét**, chi tiết đơn, giao thành công (OTP, ảnh, chữ ký), báo thất bại, **COD của tôi**, lịch sử, bật/tắt “Đang làm việc” (GPS) |
| `warehouse` | `warehouse.ops` | Tab **Kho**: trạm quét (Nhập kho / Phân loại / Xuất giao), tồn kho (cảnh báo quá hạn lưu kho), bảng kê trung chuyển & bàn giao shipper (thêm/bỏ đơn, gom tự động, xuất, nhận), kiểm kê, sự cố (thất lạc / hư hỏng / tìm thấy) |
| `dispatch` | `dispatch.manage` | Tab **Điều phối**: hàng chờ lấy / giao (lọc tỉnh, quận), chọn nhiều đơn → phân công shipper, **Tự động phân công**, danh sách shipper (online, tải việc, COD đang giữ), chi tiết shipper (việc, vị trí, *Xem bản đồ*, gọi) |
| `finance` | `cod.view` hoặc `cod.manage` | Tab **Tài chính**: tổng quan COD & công nợ, đối soát shop (xem). Có `cod.manage`: shipper giữ COD → lập phiếu nộp, xác nhận / hủy phiếu nộp, lập / xác nhận / hủy / thanh toán bảng đối soát |
| `complaints`, `returns` | `complaints.view` / `complaints.manage`; `returns.manage` | Tab **CSKH**: khiếu nại (lọc, tìm, chi tiết, trao đổi kèm ảnh, *Xử lý*; *Duyệt* bồi thường khi có `complaints.approve`), tạo khiếu nại (quét mã đơn); hàng hoàn (lọc, chi tiết, cập nhật trạng thái) |
| `orders`, `dashboard` | `orders.view`; `dashboard.view` | Tab **Tra cứu**: tìm vận đơn (mã, SĐT, tên), quét mã, chi tiết đơn đầy đủ; **Dashboard điều hành** (KPI, biểu đồ 14 ngày, cảnh báo) |

Thanh tab: **Trang chủ** + tối đa **3 tab vai trò** theo thứ tự ưu tiên shipper → kho → điều phối → tài chính → CSKH → tra cứu + **Tài khoản**.
Phân hệ không đủ chỗ trên thanh tab được mở từ ô **Chức năng khác** trên Trang chủ. Trang chủ luôn có thẻ số liệu nhanh của từng phân hệ
(bấm vào con số để mở đúng danh sách đã lọc), ô tìm / quét mã vận đơn và chuông thông báo.

Nút thao tác chỉ hiện khi tài khoản có quyền tương ứng (cùng chuỗi quyền với `[StaffAuth(...)]` phía máy chủ); máy chủ vẫn kiểm tra lại
và trả 403 kèm thông báo nếu thiếu quyền. Phiên hết hạn (401) → app tự đăng xuất về màn hình đăng nhập.

### Tài khoản mẫu

Lấy từ `CourierExpress/Database/02_seed.sql` (header file ghi rõ: *mật khẩu tất cả tài khoản mẫu: `123456`* – đổi ngay khi dùng thật).
`03_demo_data.sql` chỉ thêm tài khoản **shop** (`shophoahong`, `shopnhaxinh`, `shoptechzone`, `shopnongsan` – dùng App CE Shop, không đăng nhập được CE Staff)
và 3 shipper không có tài khoản đăng nhập (SPD01–03).

| Tài khoản | Vai trò | Thấy trên CE Staff |
|---|---|---|
| `superadmin` | Super Admin (toàn quyền) | Kho, Điều phối, Tài chính, CSKH, Tra cứu/Dashboard (không phải shipper) |
| `admin` | Quản trị viên | Kho, Điều phối, Tài chính, CSKH (khiếu nại + duyệt + hàng hoàn), Tra cứu/Dashboard |
| `qlkho` | Quản lý kho | Kho, Điều phối, CSKH (xem khiếu nại, hàng hoàn), Tra cứu/Dashboard |
| `nvkho` | Nhân viên kho | Kho, CSKH (hàng hoàn), Tra cứu |
| `dieuphoi` | Điều phối | Kho, Điều phối, Tra cứu/Dashboard |
| `shipper01`, `shipper02` | Shipper (SP01, SP02) | Nhiệm vụ, Quét, COD, lịch sử, GPS |
| `ketoan` | Kế toán | Tài chính (quản lý), CSKH (xem + **duyệt bồi thường**), Tra cứu/Dashboard |
| `cskh` | Chăm sóc khách hàng | CSKH (khiếu nại tạo/xử lý, hàng hoàn), Tra cứu/Dashboard |

Mật khẩu: `123456` cho tất cả (theo dữ liệu mẫu – xem thêm README chính của dự án). Tài khoản shop (`shopdemo`, `shopnv`…) bị từ chối với thông báo “dùng App CE Shop”.

## 2. Chạy thử bằng Expo Go

1. Máy tính chạy web Courier Express trong cùng mạng Wi-Fi với điện thoại, lắng nghe trên IP LAN (VD `dotnet run --urls http://0.0.0.0:5180`).
2. Cài **Expo Go** trên điện thoại (Android: Google Play, iOS: App Store – bản tương thích SDK 52).
3. Trong thư mục `StaffApp-Mobile`:
   ```bash
   npm install
   npx expo start          # quét QR bằng Expo Go (iOS: bằng app Camera)
   ```
4. Màn hình đăng nhập → bấm “Máy chủ” nhập `http://<IP-máy-tính>:5180` (mặc định lấy từ `app.json → expo.extra.defaultServerUrl`).

Lưu ý với Expo Go: GPS **chạy nền** của shipper chỉ hoạt động trên bản build (APK/IPA); trong Expo Go app tự chuyển sang gửi vị trí khi đang mở ứng dụng.

Kiểm tra tĩnh mã nguồn (không cần cài thư viện): `node scripts/verify.js` – kiểm import/export, dependencies, component JSX,
tên màn hình, và đối chiếu toàn bộ API app gọi với route + DTO trong `StaffApiController*.cs` / `ShipperApiController.cs`.

## 3. Build APK bằng GitHub Actions

Workflow **“Build Mobile APKs”** của repo build **tất cả** app di động (CE Staff, CE Shop…). Workflow tìm thư mục app theo
`package.json` có `"name": "courier-express-staff"` – **không đổi tên này**.

1. Đẩy mã nguồn lên GitHub → tab **Actions** → chọn **Build Mobile APKs** → **Run workflow**.
2. (Tùy chọn) nhập địa chỉ máy chủ mặc định (VD `http://192.168.1.10:5180`) – workflow ghi vào `app.json → expo.extra.defaultServerUrl`.
3. Chờ build xong → tải file APK trong mục **Artifacts** của lần chạy → cài lên điện thoại Android (cho phép “Cài ứng dụng không rõ nguồn”).

Build bằng EAS (Expo cloud) nếu muốn bản iOS: `npx eas build -p android --profile preview` (APK) hoặc `-p ios --profile production`.

Định danh ứng dụng: `com.courierexpress.staff` (Android package & iOS bundle id) – cài song song được với CE Shipper cũ; nên gỡ CE Shipper
sau khi chuyển sang CE Staff để tránh hai app cùng gửi GPS.

## 4. Cấu trúc mã nguồn

```
App.js                      Điều hướng: stack + tab động theo profile.modules
src/api.js                  fetch duy nhất: timeout, 401 → đăng xuất, lỗi tiếng Việt, multipart; staff.* và shipper.*
src/auth.js                 Đăng nhập /api/staff/auth/login, profile, modules, has(), can() ("*" = toàn quyền), refreshMe(), logout; bật/tắt GPS chỉ khi có module shipper
src/modules.js              Nhóm phân hệ, ưu tiên tab, mở phân hệ từ Trang chủ
src/location.js             GPS shipper (giữ nguyên hành vi CE Shipper: chạy nền + bộ đệm khi mất mạng)
src/lookups.js, hooks.js    Danh mục dùng chung (kho, shipper, tỉnh…); useLoad / usePaged / useAction / xác nhận
src/components/             ui.js, PickerModal (tìm không dấu), PickField, Scanner (quét liên tục, chống trùng 2,5 giây), DateField (lịch dựng bằng View), ShipperHome, TaskCard
src/screens/                StaffHome, Notifications, Profile, ChangePassword, Login
  shipper/                  Tasks, Scan, Order, Deliver, Fail, Cod, History (từ CE Shipper)
  warehouse/                Hub, WhScan, WhInventory, WhManifests, WhManifestCreate, WhManifestDetail, WhStocktake, WhIncidents, WhIncidentCreate
  dispatch/                 Hub, DispatchQueue, DispatchShippers, DispatchShipperDetail
  finance/                  Hub (tổng quan), FinHolders, FinHolderDetail, FinRemittances, FinRemittanceDetail, FinSettlements, FinSettlementGenerate, FinSettlementDetail
  cases/                    Hub, Complaints, ComplaintDetail, ComplaintCreate, Returns, ReturnDetail
  orders/                   LookupHub, OrderLookup, StaffOrderDetail, Dashboard
scripts/verify.js           Kiểm tra tĩnh + đối chiếu API với backend C#
```

Không dùng thư viện native ngoài danh sách của CE Shipper: biểu đồ, danh sách chọn, lịch chọn ngày đều dựng bằng View;
“Xem bản đồ” mở Google Maps / Apple Maps qua `Linking`.
