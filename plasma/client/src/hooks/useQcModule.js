import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { qcApi } from '../api/qc';

export function useQcJobs(params = {}) {
  return useQuery({
    queryKey: ['qc', 'jobs', params],
    queryFn: () => qcApi.getJobs(params),
    keepPreviousData: true,
  });
}

export function useQcJob(id) {
  return useQuery({
    queryKey: ['qc', 'jobs', id],
    queryFn: () => qcApi.getJob(id),
    enabled: !!id,
  });
}

export function useCreateQcJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: qcApi.createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc', 'jobs'] });
      toast.success('QC job created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message ?? 'Failed to create QC job');
    },
  });
}

export function useUpdateQcJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => qcApi.updateJob(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['qc', 'jobs', variables.id] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message ?? 'Update failed');
    },
  });
}

export function useSaveQcResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => qcApi.saveResults(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qc', 'jobs', variables.id] });
      toast.success('Results saved');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save results');
    },
  });
}

export function useCompleteQcJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => qcApi.completeJob(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['qc', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['qc', 'jobs', id] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['repair', 'jobs'] });
      toast.success('QC job completed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message ?? 'Failed to complete QC job');
    },
  });
}
