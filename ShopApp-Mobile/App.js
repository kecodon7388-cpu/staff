import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/auth';
import { colors } from './src/theme';
import { Loading } from './src/components/ui';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import AccountScreen from './src/screens/AccountScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import CreateOrderScreen from './src/screens/CreateOrderScreen';
import ScanScreen from './src/screens/ScanScreen';
import SettlementScreen from './src/screens/SettlementScreen';
import ComplaintsScreen from './src/screens/ComplaintsScreen';
import ComplaintDetailScreen from './src/screens/ComplaintDetailScreen';
import CreateComplaintScreen from './src/screens/CreateComplaintScreen';
import ReturnsScreen from './src/screens/ReturnsScreen';
import AddressesScreen from './src/screens/AddressesScreen';
import AddressFormScreen from './src/screens/AddressFormScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import BankScreen from './src/screens/BankScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.brand } };

const ICONS = { Home: 'home', Orders: 'cube', Finance: 'wallet', Account: 'person-circle' };

const Blank = () => null;

function CreateTabButton({ onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.plusWrap} accessibilityRole="button" accessibilityLabel="Tạo đơn">
      <View style={styles.plusBtn}><Ionicons name="add" size={32} color="#fff" /></View>
    </Pressable>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarStyle: { height: Platform.OS === 'ios' ? 88 : 66, paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 28 : 10, borderTopColor: colors.border },
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={focused ? ICONS[route.name] : ICONS[route.name] + '-outline'} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Tab.Screen
        name="CreateTab"
        component={Blank}
        options={({ navigation }) => ({
          title: 'Tạo đơn',
          tabBarButton: () => <CreateTabButton onPress={() => navigation.navigate('CreateOrder')} />,
        })}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('CreateOrder'); },
        })}
      />
      <Tab.Screen name="Finance" component={FinanceScreen} options={{ title: 'Tài chính' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
}

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
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn hàng' }} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} options={{ title: 'Tạo đơn hàng' }} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Settlement" component={SettlementScreen} options={{ title: 'Phiên đối soát' }} />
          <Stack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Khiếu nại' }} />
          <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} options={{ title: 'Chi tiết khiếu nại' }} />
          <Stack.Screen name="CreateComplaint" component={CreateComplaintScreen} options={{ title: 'Gửi khiếu nại' }} />
          <Stack.Screen name="Returns" component={ReturnsScreen} options={{ title: 'Hàng hoàn' }} />
          <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: 'Sổ địa chỉ' }} />
          <Stack.Screen name="AddressForm" component={AddressFormScreen} options={{ title: 'Địa chỉ' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
          <Stack.Screen name="Bank" component={BankScreen} options={{ title: 'Tài khoản nhận tiền' }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Đổi mật khẩu' }} />
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
  plusWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  plusBtn: {
    width: 58, height: 58, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: -22,
    borderWidth: 4, borderColor: '#fff',
    ...Platform.select({ ios: { shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 6 } }),
  },
});
