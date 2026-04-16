import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { level3Api } from '../api/level3';

export function useActiveRepairs(params = {}) {
  return useQuery({
    queryKey: ['level3', 'active', params],
    queryFn: () => level3Api.getActiveRepairs(params),
    keepPreviousData: true,
  });
}

export function useCompletedRepairs(params = {}) {
  return useQuery({
    queryKey: ['level3', 'completed', params],
    queryFn: () => level3Api.getCompletedRepairs(params),
    keepPreviousData: true,
  });
}

export function useRepair(id) {
  return useQuery({
    queryKey: ['level3', id],
    queryFn: () => level3Api.getRepairById(id),
    enabled: !!id,
  });
}

export function useAvailableL3Locations() {
  return useQuery({
    queryKey: ['level3', 'locations'],
    queryFn: level3Api.getAvailableLocations,
    staleTime: 30000, // 30 seconds
  });
}

export function useBookRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: level3Api.bookRepair,
    onSuccess: () => {
      queryClient.invalidateQueries(['level3']);
    },
  });
}

export function useUpdateRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => level3Api.updateRepair(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['level3']);
      queryClient.invalidateQueries(['level3', variables.id]);
    },
  });
}
