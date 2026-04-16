import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateSalesOrder from '../../client/src/pages/CreateSalesOrder';
import { renderWithProviders } from './utils/render';

const {
  mockNavigate,
  mockCreateSalesOrder,
  mockGetAvailableDevicesGrouped,
  toastSuccess,
  toastError,
  toastDefault,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockCreateSalesOrder: vi.fn(),
  mockGetAvailableDevicesGrouped: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastDefault: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../client/src/hooks/useSalesOrders', () => ({
  useCreateSalesOrder: () => ({
    mutateAsync: mockCreateSalesOrder,
    isLoading: false,
  }),
}));

vi.mock('../../client/src/hooks/useDevices', () => ({
  useFilterOptions: () => ({
    data: {
      options: {
        customers: [
          { id: 1, name: 'Retail Customer', customer_code: 'CST-1', is_backmarket: false },
          { id: 2, name: 'BackMarket Consumer', customer_code: 'CST-78', is_backmarket: false },
        ],
        suppliers: [{ id: 1, name: 'Supplier A' }],
        manufacturers: [{ id: 1, name: 'Apple' }],
        storageOptions: [128],
      },
    },
  }),
}));

vi.mock('../../client/src/api/salesOrders', () => ({
  getAvailableDevicesGrouped: mockGetAvailableDevicesGrouped,
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastDefault, {
    success: toastSuccess,
    error: toastError,
  }),
}));

function getSelectForLabel(label: string) {
  const labelElement = screen.getByText(label);
  return labelElement.closest('div')?.querySelector('select') as HTMLSelectElement;
}

function getForm() {
  const form = screen.getByRole('button', { name: /create sales order/i }).closest('form');
  if (!form) {
    throw new Error('Sales order form not found');
  }
  return form;
}

async function addOneOrderLine(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(getSelectForLabel('Supplier *'), '1');

  await waitFor(() => {
    expect(mockGetAvailableDevicesGrouped).toHaveBeenCalled();
  });

  await screen.findByText('iPhone 15 Pro');
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

describe('CreateSalesOrder', () => {
  beforeEach(() => {
    mockGetAvailableDevicesGrouped.mockReset();
    mockGetAvailableDevicesGrouped.mockResolvedValue({
      groups: [
        {
          supplier_id: 1,
          supplier_name: 'Supplier A',
          manufacturer_id: 1,
          manufacturer_name: 'Apple',
          model_id: 1,
          model_name: 'iPhone 15 Pro',
          model_number: 'A2890',
          storage_gb: 128,
          color: 'Black',
          grade: 'A',
          available_count: 3,
          reserved_count: 0,
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    });

    mockCreateSalesOrder.mockReset();
    mockNavigate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastDefault.mockReset();
  });

  it('shows toast.error when customer is missing', async () => {
    renderWithProviders(<CreateSalesOrder />);

    fireEvent.submit(getForm());

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Customer is required');
    });
  });

  it('shows toast.error when there are no order lines', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreateSalesOrder />);

    await user.selectOptions(getSelectForLabel('Customer *'), '1');
    fireEvent.submit(getForm());

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('At least one line is required');
    });
  });

  it('enforces Backmarket Order ID requirement', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreateSalesOrder />);

    await user.selectOptions(getSelectForLabel('Customer *'), '2');
    await addOneOrderLine(user);

    await user.click(screen.getByRole('button', { name: /create sales order/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Backmarket Order ID is required for Backmarket orders');
    });
  });

  it('shows toast.error when quantity is outside valid bounds', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreateSalesOrder />);

    await user.selectOptions(getSelectForLabel('Supplier *'), '1');
    await screen.findByText('iPhone 15 Pro');

    const quantityInput = screen.getByRole('spinbutton');
    await user.clear(quantityInput);
    await user.type(quantityInput, '0');

    await user.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Please enter a valid quantity between 1 and 3');
    });
  });

  it('shows toast.success and navigates on valid submission', async () => {
    const user = userEvent.setup();

    mockCreateSalesOrder.mockResolvedValue({
      success: true,
      id: 55,
      so_number: 'SO-00055',
    });

    renderWithProviders(<CreateSalesOrder />);

    await user.selectOptions(getSelectForLabel('Customer *'), '1');
    await addOneOrderLine(user);
    await user.click(screen.getByRole('button', { name: /create sales order/i }));

    await waitFor(() => {
      expect(mockCreateSalesOrder).toHaveBeenCalledTimes(1);
      expect(toastSuccess).toHaveBeenCalledWith('Sales order SO-00055 created successfully');
      expect(mockNavigate).toHaveBeenCalledWith('/goods-out/55');
    });
  });

  it('uses the shared error helper for legacy API error shapes on submit', async () => {
    const user = userEvent.setup();

    mockCreateSalesOrder.mockRejectedValue({
      response: {
        data: {
          message: 'Legacy create failure',
        },
      },
    });

    renderWithProviders(<CreateSalesOrder />);

    await user.selectOptions(getSelectForLabel('Customer *'), '1');
    await addOneOrderLine(user);
    await user.click(screen.getByRole('button', { name: /create sales order/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Error creating sales order: Legacy create failure');
    });
  });
});
