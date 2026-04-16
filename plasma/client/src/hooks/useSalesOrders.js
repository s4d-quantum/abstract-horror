import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as salesOrdersApi from '../api/salesOrders';

export const useSalesOrders = (filters) => {
  return useQuery({
    queryKey: ['salesOrders', filters],
    queryFn: () => salesOrdersApi.getSalesOrders(filters),
    keepPreviousData: true
  });
};

export const useSalesOrder = (id) => {
  return useQuery({
    queryKey: ['salesOrder', id],
    queryFn: () => salesOrdersApi.getSalesOrder(id),
    enabled: !!id
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesOrdersApi.createSalesOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
    }
  });
};

export const useUpdateSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => salesOrdersApi.updateSalesOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrder', variables.id] });
    }
  });
};

export const useConfirmSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesOrdersApi.confirmSalesOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrder', id] });
    }
  });
};

export const useCancelSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salesOrdersApi.cancelSalesOrder,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrder', id] });
    }
  });
};

export const usePickDevices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, devices }) => salesOrdersApi.pickDevices(id, devices),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrder', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['pickedDevices', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
};

export const usePickedDevices = (id) => {
  return useQuery({
    queryKey: ['pickedDevices', id],
    queryFn: () => salesOrdersApi.getPickedDevices(id),
    enabled: !!id
  });
};

export const useShipSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => salesOrdersApi.shipSalesOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesOrder', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    }
  });
};
