import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreatePurchaseOrder from '../../client/src/pages/CreatePurchaseOrder';
import { renderWithProviders } from './utils/render';

const {
  mockNavigate,
  mockCreatePurchaseOrder,
  mockLookupTacModel,
  toastSuccess,
  toastError,
  toastDefault,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockCreatePurchaseOrder: vi.fn(),
  mockLookupTacModel: vi.fn(),
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

vi.mock('../../client/src/hooks/usePurchaseOrders', () => ({
  useCreatePurchaseOrder: () => ({
    mutateAsync: mockCreatePurchaseOrder,
    isLoading: false,
  }),
}));

vi.mock('../../client/src/hooks/useDevices', () => ({
  useFilterOptions: () => ({
    data: {
      options: {
        suppliers: [{ id: 1, name: 'Test Supplier' }],
        manufacturers: [{ id: 1, name: 'Apple' }],
        models: [{ id: 1, manufacturer_id: 1, model_name: 'iPhone 15 Pro', model_number: 'A2890' }],
      },
    },
  }),
}));

vi.mock('../../client/src/api/tac', () => ({
  lookupTacModel: mockLookupTacModel,
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

function getInputForLabel(label: string) {
  const labelElement = screen.getByText(label);
  return labelElement.closest('div')?.querySelector('input') as HTMLInputElement;
}

async function fillLineForValidSubmission(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(getSelectForLabel('Supplier *'), '1');
  await user.selectOptions(getSelectForLabel('Manufacturer *'), '1');

  const modelContainer = screen.getByText('Model *').closest('div');
  if (!modelContainer) {
    throw new Error('Model field container not found');
  }

  await user.click(within(modelContainer).getByRole('button', { name: /select model/i }));
  await user.click(screen.getByRole('button', { name: 'iPhone 15 Pro' }));
}

describe('CreatePurchaseOrder', () => {
  beforeEach(() => {
    mockLookupTacModel.mockReset();
    mockLookupTacModel.mockResolvedValue({
      success: true,
      data: {
        colors: ['Black'],
        storages: [128],
      },
    });
    mockCreatePurchaseOrder.mockReset();
    mockNavigate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastDefault.mockReset();
  });

  it('shows toast.error when supplier is missing', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    renderWithProviders(<CreatePurchaseOrder />);

    const form = screen.getByRole('button', { name: /create purchase order/i }).closest('form');
    if (!form) {
      throw new Error('Form not found');
    }

    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Supplier is required');
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows toast.error when manufacturer or model is missing', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreatePurchaseOrder />);

    await user.selectOptions(getSelectForLabel('Supplier *'), '1');

    const form = screen.getByRole('button', { name: /create purchase order/i }).closest('form');
    if (!form) {
      throw new Error('Form not found');
    }

    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Manufacturer is required');
    });
  });

  it('shows toast.error when quantity is zero', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreatePurchaseOrder />);

    await fillLineForValidSubmission(user);

    const qtyInput = getInputForLabel('Quantity *');
    await user.clear(qtyInput);
    await user.type(qtyInput, '0');

    const form = screen.getByRole('button', { name: /create purchase order/i }).closest('form');
    if (!form) {
      throw new Error('Form not found');
    }

    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Quantity must be at least 1');
    });
  });

  it('shows toast.success and navigates on valid submission', async () => {
    const user = userEvent.setup();

    mockCreatePurchaseOrder.mockResolvedValue({ id: 42, po_number: 'PO-0042' });

    renderWithProviders(<CreatePurchaseOrder />);

    await fillLineForValidSubmission(user);
    await user.click(screen.getByRole('button', { name: /create purchase order/i }));

    await waitFor(() => {
      expect(mockCreatePurchaseOrder).toHaveBeenCalledTimes(1);
      expect(toastSuccess).toHaveBeenCalledWith('Purchase order PO-0042 created successfully');
      expect(mockNavigate).toHaveBeenCalledWith('/goods-in/42');
    });
  });

  it('uses the shared error helper for legacy API error shapes on submit', async () => {
    const user = userEvent.setup();

    mockCreatePurchaseOrder.mockRejectedValue({
      response: {
        data: {
          message: 'Legacy purchase failure',
        },
      },
    });

    renderWithProviders(<CreatePurchaseOrder />);

    await fillLineForValidSubmission(user);
    await user.click(screen.getByRole('button', { name: /create purchase order/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Error creating purchase order: Legacy purchase failure');
    });
  });
});
