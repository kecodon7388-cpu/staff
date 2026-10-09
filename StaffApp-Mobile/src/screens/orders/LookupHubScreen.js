/** Tab "Tra cứu": tra cứu vận đơn (nếu có quyền đọc đơn), ngược lại hiện Dashboard điều hành. */
import React from 'react';
import { useAuth } from '../../auth';
import OrderLookupScreen from './OrderLookupScreen';
import DashboardScreen from './DashboardScreen';

export default function LookupHubScreen(props) {
  const { canReadOrders } = useAuth();
  return canReadOrders ? <OrderLookupScreen {...props} embedded /> : <DashboardScreen {...props} embedded />;
}
