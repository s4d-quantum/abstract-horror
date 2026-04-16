import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../api/customers';

export function useCustomers(params = {}) {
    return useQuery({
        queryKey: ['customers', params],
        queryFn: () => customersApi.getAll(params),
        keepPreviousData: true,
    });
}

export function useCustomer(id) {
    return useQuery({
        queryKey: ['customers', id],
        queryFn: () => customersApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: customersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(['customers']);
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => customersApi.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['customers']);
            queryClient.invalidateQueries(['customers', variables.id]);
        },
    });
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: customersApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['customers']);
        },
    });
}

export function useDeactivateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: customersApi.deactivate,
        onSuccess: (_, customerId) => {
            queryClient.invalidateQueries(['customers']);
            queryClient.invalidateQueries(['customers', customerId]);
        },
    });
}

export function useReactivateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: customersApi.reactivate,
        onSuccess: (_, customerId) => {
            queryClient.invalidateQueries(['customers']);
            queryClient.invalidateQueries(['customers', customerId]);
        },
    });
}
