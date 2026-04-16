import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '../api/devices';

export function useDevices(params = {}) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => devicesApi.getAll(params),
    keepPreviousData: true,
  });
}

export function useDevice(id) {
  return useQuery({
    queryKey: ['devices', id],
    queryFn: () => devicesApi.getById(id),
    enabled: !!id,
  });
}

export function useDeviceHistory(id, limit = 50) {
  return useQuery({
    queryKey: ['devices', id, 'history', limit],
    queryFn: () => devicesApi.getHistory(id, limit),
    enabled: !!id,
  });
}

export function useFilterOptions() {
  return useQuery({
    queryKey: ['devices', 'filter-options'],
    queryFn: devicesApi.getFilterOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => devicesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['devices', variables.id]);
    },
  });
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }) => devicesApi.updateStatus(id, status, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['devices', variables.id]);
    },
  });
}
