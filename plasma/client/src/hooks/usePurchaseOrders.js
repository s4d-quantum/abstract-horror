import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi } from '../api/purchaseOrders';

export function usePurchaseOrders(params = {}) {
  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => purchaseOrdersApi.getAll(params),
    keepPreviousData: true,
  });
}

export function usePurchaseOrder(id) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => purchaseOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-orders']);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => purchaseOrdersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['purchase-orders', variables.id]);
    },
  });
}

export function useConfirmPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.confirm,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['purchase-orders', id]);
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.cancel,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['purchase-orders', id]);
    },
  });
}

export function useReceiveDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => purchaseOrdersApi.receiveDevices(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['purchase-orders', variables.id]);
      queryClient.invalidateQueries(['devices']);
    },
  });
}

export function useReceivedDevices(id, limit = 100) {
  return useQuery({
    queryKey: ['purchase-orders', id, 'devices', limit],
    queryFn: () => purchaseOrdersApi.getReceivedDevices(id, limit),
    enabled: !!id,
  });
}

export function useBookInStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.bookInStock,
    onSuccess: () => {
      queryClient.invalidateQueries(['purchase-orders']);
      queryClient.invalidateQueries(['devices']);
    },
  });
}
