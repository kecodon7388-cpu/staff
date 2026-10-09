import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import './src/location'; // đăng ký task GPS chạy nền (bắt buộc ở cấp module)
import { AuthProvider, useAuth } from './src/auth';
import { colors } from './src/theme';
import { layout } from './src/modules';
import { Loading } from './src/components/ui';

import LoginScreen from './src/screens/LoginScreen';
import StaffHomeScreen from './src/screens/StaffHomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
// Shipper (giữ nguyên từ CE Shipper)
import TasksScreen from './src/screens/shipper/TasksScreen';
import ScanScreen from './src/screens/shipper/ScanScreen';
import OrderScreen from './src/screens/shipper/OrderScreen';
import DeliverScreen from './src/screens/shipper/DeliverScreen';
import FailScreen from './src/screens/shipper/FailScreen';
import CodScreen from './src/screens/shipper/CodScreen';
import HistoryScreen from './src/screens/shipper/HistoryScreen';
// Kho
import WarehouseHubScreen from './src/screens/warehouse/WarehouseHubScreen';
import WhScanScreen from './src/screens/warehouse/WhScanScreen';
import WhInventoryScreen from './src/screens/warehouse/WhInventoryScreen';
import WhManifestsScreen from './src/screens/warehouse/WhManifestsScreen';
import WhManifestCreateScreen from './src/screens/warehouse/WhManifestCreateScreen';
import WhManifestDetailScreen from './src/screens/warehouse/WhManifestDetailScreen';
import WhStocktakeScreen from './src/screens/warehouse/WhStocktakeScreen';
import WhIncidentsScreen from './src/screens/warehouse/WhIncidentsScreen';
import WhIncidentCreateScreen from './src/screens/warehouse/WhIncidentCreateScreen';
// Điều phối
import DispatchHubScreen from './src/screens/dispatch/DispatchHubScreen';
import DispatchQueueScreen from './src/screens/dispatch/DispatchQueueScreen';
import DispatchShippersScreen from './src/screens/dispatch/DispatchShippersScreen';
import DispatchShipperDetailScreen from './src/screens/dispatch/DispatchShipperDetailScreen';
// Tài chính
import FinanceHubScreen from './src/screens/finance/FinanceHubScreen';
import FinHoldersScreen from './src/screens/finance/FinHoldersScreen';
import FinHolderDetailScreen from './src/screens/finance/FinHolderDetailScreen';
import FinRemittancesScreen from './src/screens/finance/FinRemittancesScreen';
import FinRemittanceDetailScreen from './src/screens/finance/FinRemittanceDetailScreen';
import FinSettlementsScreen from './src/screens/finance/FinSettlementsScreen';
import FinSettlementGenerateScreen from './src/screens/finance/FinSettlementGenerateScreen';
import FinSettlementDetailScreen from './src/screens/finance/FinSettlementDetailScreen';
// CSKH
import CasesHubScreen from './src/screens/cases/CasesHubScreen';
import ComplaintsScreen from './src/screens/cases/ComplaintsScreen';
import ComplaintDetailScreen from './src/screens/cases/ComplaintDetailScreen';
import ComplaintCreateScreen from './src/screens/cases/ComplaintCreateScreen';
import ReturnsScreen from './src/screens/cases/ReturnsScreen';
import ReturnDetailScreen from './src/screens/cases/ReturnDetailScreen';
// Tra cứu & quản lý
import LookupHubScreen from './src/screens/orders/LookupHubScreen';
import OrderLookupScreen from './src/screens/orders/OrderLookupScreen';
import StaffOrderDetailScreen from './src/screens/orders/StaffOrderDetailScreen';
import DashboardScreen from './src/screens/orders/DashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

const TAB_COMPONENTS = {
  Tasks: TasksScreen,
  Scan: ScanScreen,
  WarehouseTab: WarehouseHubScreen,
  DispatchTab: DispatchHubScreen,
  FinanceTab: FinanceHubScreen,
  CasesTab: CasesHubScreen,
  LookupTab: LookupHubScreen,
};

function Tabs() {
  const { modules } = useAuth();
  const { tabs } = layout(modules);
  const icons = { Home: 'home', Profile: 'person-circle' };
  tabs.forEach((t) => { icons[t.name] = t.icon; });
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarStyle: { height: Platform.OS === 'ios' ? 88 : 66, paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 28 : 10, borderTopColor: colors.border },
        tabBarIcon: ({ color, focused, size }) => route.name === 'Scan'
          ? <View style={styles.scanBtn}><Ionicons name="scan" size={26} color="#fff" /></View>
          : <Ionicons name={focused ? icons[route.name] : icons[route.name] + '-outline'} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={StaffHomeScreen} options={{ title: 'Trang chủ' }} />
      {tabs.map((t) => (
        <Tab.Screen key={t.name} name={t.name} component={TAB_COMPONENTS[t.name]}
          options={t.scan ? { title: 'Quét', tabBarLabel: () => null } : { title: t.title }} />
      ))}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}

const navyHeader = { headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#fff' };

function Root() {
  const { loading, token } = useAuth();
  if (loading) return <Loading />;
  return (
    <Stack.Navigator screenOptions={{
      headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' }, headerShadowVisible: false,
      headerStyle: { backgroundColor: '#fff' }, headerBackTitle: 'Quay lại', contentStyle: { backgroundColor: colors.bg },
    }}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Đổi mật khẩu' }} />

          {/* Shipper */}
          <Stack.Screen name="Order" component={OrderScreen} options={{ title: 'Chi tiết đơn' }} />
          <Stack.Screen name="Deliver" component={DeliverScreen} options={{ title: 'Xác nhận giao hàng' }} />
          <Stack.Screen name="Fail" component={FailScreen} options={{ title: 'Báo không thành công', presentation: 'modal' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Lịch sử công việc' }} />
          <Stack.Screen name="Cod" component={CodScreen} options={{ title: 'Tiền COD của tôi', ...navyHeader }} />

          {/* Trang phân hệ mở từ Trang chủ khi không nằm trên thanh tab */}
          <Stack.Screen name="WarehouseHub" component={WarehouseHubScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DispatchHub" component={DispatchHubScreen} options={{ headerShown: false }} />
          <Stack.Screen name="FinanceHub" component={FinanceHubScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CasesHub" component={CasesHubScreen} options={{ headerShown: false }} />
          <Stack.Screen name="LookupHub" component={LookupHubScreen} options={{ headerShown: false }} />

          {/* Kho */}
          <Stack.Screen name="WhScan" component={WhScanScreen} options={{ title: 'Trạm quét kho' }} />
          <Stack.Screen name="WhInventory" component={WhInventoryScreen} options={{ title: 'Tồn kho' }} />
          <Stack.Screen name="WhManifests" component={WhManifestsScreen} options={{ title: 'Bảng kê / chuyến' }} />
          <Stack.Screen name="WhManifestCreate" component={WhManifestCreateScreen} options={{ title: 'Tạo bảng kê' }} />
          <Stack.Screen name="WhManifestDetail" component={WhManifestDetailScreen} options={{ title: 'Bảng kê' }} />
          <Stack.Screen name="WhStocktake" component={WhStocktakeScreen} options={{ title: 'Kiểm kê kho' }} />
          <Stack.Screen name="WhIncidents" component={WhIncidentsScreen} options={{ title: 'Sự cố kho' }} />
          <Stack.Screen name="WhIncidentCreate" component={WhIncidentCreateScreen} options={{ title: 'Ghi nhận sự cố' }} />

          {/* Điều phối */}
          <Stack.Screen name="DispatchQueue" component={DispatchQueueScreen} options={{ title: 'Hàng chờ điều phối' }} />
          <Stack.Screen name="DispatchShippers" component={DispatchShippersScreen} options={{ title: 'Shipper' }} />
          <Stack.Screen name="DispatchShipperDetail" component={DispatchShipperDetailScreen} options={{ title: 'Shipper' }} />

          {/* Tài chính */}
          <Stack.Screen name="FinHolders" component={FinHoldersScreen} options={{ title: 'Shipper giữ COD' }} />
          <Stack.Screen name="FinHolderDetail" component={FinHolderDetailScreen} options={{ title: 'Đơn đang giữ tiền' }} />
          <Stack.Screen name="FinRemittances" component={FinRemittancesScreen} options={{ title: 'Phiếu nộp tiền' }} />
          <Stack.Screen name="FinRemittanceDetail" component={FinRemittanceDetailScreen} options={{ title: 'Phiếu nộp tiền' }} />
          <Stack.Screen name="FinSettlements" component={FinSettlementsScreen} options={{ title: 'Đối soát shop' }} />
          <Stack.Screen name="FinSettlementGenerate" component={FinSettlementGenerateScreen} options={{ title: 'Lập bảng đối soát' }} />
          <Stack.Screen name="FinSettlementDetail" component={FinSettlementDetailScreen} options={{ title: 'Bảng đối soát' }} />

          {/* CSKH */}
          <Stack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Khiếu nại' }} />
          <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ title: 'Khiếu nại' }} />
          <Stack.Screen name="ComplaintCreate" component={ComplaintCreateScreen} options={{ title: 'Tạo khiếu nại' }} />
          <Stack.Screen name="Returns" component={ReturnsScreen} options={{ title: 'Hàng hoàn' }} />
          <Stack.Screen name="ReturnDetail" component={ReturnDetailScreen} options={{ title: 'Yêu cầu hoàn' }} />

          {/* Tra cứu & quản lý */}
          <Stack.Screen name="OrderLookup" component={OrderLookupScreen} options={{ title: 'Tra cứu vận đơn' }} />
          <Stack.Screen name="StaffOrderDetail" component={StaffOrderDetailScreen} options={{ title: 'Chi tiết vận đơn' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard điều hành' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  scanBtn: {
    width: 58, height: 58, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: -26,
    borderWidth: 4, borderColor: '#fff',
    ...Platform.select({ ios: { shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 6 } }),
  },
});
