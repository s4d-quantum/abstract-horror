import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '../api/suppliers';

export function useSuppliers(params = {}) {
    return useQuery({
        queryKey: ['suppliers', params],
        queryFn: () => suppliersApi.getAll(params),
        keepPreviousData: true,
    });
}

export function useSupplier(id) {
    return useQuery({
        queryKey: ['suppliers', id],
        queryFn: () => suppliersApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: suppliersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }) => suppliersApi.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['suppliers']);
            queryClient.invalidateQueries(['suppliers', variables.id]);
        },
    });
}

export function useDeleteSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: suppliersApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries(['suppliers']);
        },
    });
}

export function useDeactivateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: suppliersApi.deactivate,
        onSuccess: (_, supplierId) => {
            queryClient.invalidateQueries(['suppliers']);
            queryClient.invalidateQueries(['suppliers', supplierId]);
        },
    });
}

export function useReactivateSupplier() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: suppliersApi.reactivate,
        onSuccess: (_, supplierId) => {
            queryClient.invalidateQueries(['suppliers']);
            queryClient.invalidateQueries(['suppliers', supplierId]);
        },
    });
}
