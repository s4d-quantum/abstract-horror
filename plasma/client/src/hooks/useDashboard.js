import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: dashboardApi.getMetrics,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useRecentPurchaseOrders(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'recent-pos', limit],
    queryFn: () => dashboardApi.getRecentPurchaseOrders(limit),
  });
}

export function useRecentSalesOrders(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'recent-sos', limit],
    queryFn: () => dashboardApi.getRecentSalesOrders(limit),
  });
}

export function useActivitySummary() {
  return useQuery({
    queryKey: ['dashboard', 'activity-summary'],
    queryFn: dashboardApi.getActivitySummary,
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['dashboard', 'low-stock-alerts'],
    queryFn: dashboardApi.getLowStockAlerts,
  });
}

export function useDeviceStatusBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'status-breakdown'],
    queryFn: dashboardApi.getStatusBreakdown,
  });
}

export function useTopManufacturers(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'top-manufacturers', limit],
    queryFn: () => dashboardApi.getTopManufacturers(limit),
  });
}
