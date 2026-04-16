import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repairApi } from '../api/repair';

export function useRepairMeta() {
  return useQuery({
    queryKey: ['repair', 'meta'],
    queryFn: repairApi.getMeta,
    staleTime: 30000,
  });
}

export function useRepairJobs(params = {}) {
  return useQuery({
    queryKey: ['repair', 'jobs', params],
    queryFn: () => repairApi.getJobs(params),
    keepPreviousData: true,
  });
}

export function useRepairJob(id) {
  return useQuery({
    queryKey: ['repair', 'jobs', id],
    queryFn: () => repairApi.getJob(id),
    enabled: !!id,
  });
}

export function useCreateRepairJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: repairApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
    },
  });
}

export function useUpdateRepairJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.updateJob(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs', variables.id] });
    },
  });
}

export function useAddDevicesToRepairJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.addDevicesToJob(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useRepairRecord(id) {
  return useQuery({
    queryKey: ['repair', 'records', id],
    queryFn: () => repairApi.getRecord(id),
    enabled: !!id,
  });
}

export function useUpdateRepairRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.updateRecord(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'records', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useAddRepairComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.addComment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'records', variables.id] });
    },
  });
}

export function useReserveRepairPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.reservePart(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'records', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
    },
  });
}

export function useFitRepairPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.fitPart(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'records', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useRemoveRepairPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => repairApi.removePart(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'records', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
    },
  });
}

export function useEscalateRepairRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => repairApi.escalateToLevel3(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'records', id] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['level3'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useBulkParts(jobId, deviceIds) {
  return useQuery({
    queryKey: ['repair', 'bulk-parts', jobId, deviceIds ? deviceIds.join(',') : null],
    queryFn: () => repairApi.getBulkParts(jobId, deviceIds),
    enabled: !!jobId && !!deviceIds && deviceIds.length > 0,
    staleTime: 10000,
  });
}

export function useBulkRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, data }) => repairApi.bulkRepair(jobId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs', variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
