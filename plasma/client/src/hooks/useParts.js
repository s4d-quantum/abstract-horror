import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partsApi } from '../api/parts';

export function usePartsMeta() {
  return useQuery({
    queryKey: ['parts', 'meta'],
    queryFn: partsApi.getMeta,
    staleTime: 30000,
  });
}

export function usePartModels(params = {}) {
  return useQuery({
    queryKey: ['parts', 'models', params],
    queryFn: () => partsApi.getModels(params),
    keepPreviousData: true,
  });
}

export function usePartModelDetail(id) {
  return useQuery({
    queryKey: ['parts', 'models', id],
    queryFn: () => partsApi.getModelDetail(id),
    enabled: !!id,
  });
}

export function usePartBases(params = {}, options = {}) {
  return useQuery({
    queryKey: ['parts', 'bases', params],
    queryFn: () => partsApi.getBases(params),
    enabled: options.enabled !== false,
  });
}

export function usePartBaseDetail(id) {
  return useQuery({
    queryKey: ['parts', 'bases', String(id || '')],
    queryFn: () => partsApi.getBaseDetail(id),
    enabled: !!id,
  });
}

export function useCreatePartBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.createBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'meta'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
    },
  });
}

export function useUpdatePartBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => partsApi.updateBase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'compatibility'] });
    },
  });
}

export function useDeletePartBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.deleteBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'compatibility'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
    },
  });
}

export function usePartVariants(params = {}, options = {}) {
  return useQuery({
    queryKey: ['parts', 'variants', params],
    queryFn: () => partsApi.getVariants(params),
    enabled: options.enabled !== false,
  });
}

export function usePartVariantSearch(searchTerm, options = {}) {
  return useQuery({
    queryKey: ['parts', 'variants', 'search', searchTerm || ''],
    queryFn: () => partsApi.getVariants({ search: searchTerm || undefined }),
    enabled: options.enabled !== false && !!searchTerm,
    staleTime: 10000,
  });
}

export function useCreatePartVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.createVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
    },
  });
}

export function useUpdatePartVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => partsApi.updateVariant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
    },
  });
}

export function useDeletePartVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.deleteVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
    },
  });
}

export function usePartCompatibility(params = {}, options = {}) {
  return useQuery({
    queryKey: ['parts', 'compatibility', params],
    queryFn: () => partsApi.getCompatibility(params),
    enabled: options.enabled !== false,
  });
}

export function useCreatePartCompatibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.createCompatibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'compatibility'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
    },
  });
}

export function useUpdatePartCompatibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => partsApi.updateCompatibility(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'compatibility'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models', String(variables.data?.model_id || '')] });
    },
  });
}

export function useDeletePartCompatibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.deleteCompatibility,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'bases'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'compatibility'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
    },
  });
}

export function usePartGoodsIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.goodsIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'lots', 'history'] });
    },
  });
}

export function usePartBulkGoodsIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.bulkGoodsIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'lots', 'history'] });
    },
  });
}

export function usePartGoodsOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: partsApi.goodsOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
    },
  });
}

export function useFaultReports(params = {}, options = {}) {
  return useQuery({
    queryKey: ['parts', 'faulty', params],
    queryFn: () => partsApi.getFaultReports(params),
    enabled: options.enabled !== false,
  });
}

export function useUpdateFaultReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => partsApi.updateFaultReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts', 'faulty'] });
    },
  });
}

export function useGoodsInHistory(params = {}, options = {}) {
  return useQuery({
    queryKey: ['parts', 'lots', 'history', params],
    queryFn: () => partsApi.getGoodsInHistory(params),
    enabled: options.enabled !== false,
    keepPreviousData: true,
  });
}

export function useGoodsInDetail(params = {}, options = {}) {
  return useQuery({
    queryKey: ['parts', 'lots', 'detail', params],
    queryFn: () => partsApi.getGoodsInDetail(params),
    enabled: options.enabled !== false && !!(params.lot_ref || params.lot_id),
  });
}
