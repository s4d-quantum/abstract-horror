import { screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BookInStock from '../../client/src/pages/BookInStock';
import { renderWithProviders } from './utils/render';

const {
  mockNavigate,
  mockBookIn,
  mockLookupTac,
  toastSuccess,
  toastError,
  toastDefault,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockBookIn: vi.fn(),
  mockLookupTac: vi.fn(),
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
  useBookInStock: () => ({
    mutateAsync: mockBookIn,
    isLoading: false,
  }),
}));

vi.mock('../../client/src/hooks/useSuppliers', () => ({
  useSuppliers: () => ({
    data: {
      suppliers: [{ id: 1, name: 'Supplier A' }],
    },
  }),
}));

vi.mock('../../client/src/hooks/useDevices', () => ({
  useFilterOptions: () => ({
    data: {
      options: {
        locations: [{ id: 1, code: 'TR001', name: 'Tray 1' }],
      },
    },
  }),
}));

vi.mock('../../client/src/api/tac', () => ({
  lookupTac: mockLookupTac,
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastDefault, {
    success: toastSuccess,
    error: toastError,
  }),
}));

function getSupplierSelect() {
  const labelElement = screen.getByText('Supplier *');
  return labelElement.closest('div')?.querySelector('select') as HTMLSelectElement;
}

describe('BookInStock', () => {
  beforeEach(() => {
    mockLookupTac.mockReset();
    mockBookIn.mockReset();
    mockNavigate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastDefault.mockReset();

    mockLookupTac.mockResolvedValue({
      success: true,
      data: {
        manufacturer: 'Apple',
        model: 'iPhone 15 Pro',
        manufacturerId: 1,
        modelId: 1,
        colors: ['Black'],
        storages: [128],
      },
    });
  });

  it('shows toast.success for valid IMEI scan', async () => {
    const user = userEvent.setup();

    renderWithProviders(<BookInStock />);

    await user.selectOptions(getSupplierSelect(), '1');
    await user.type(screen.getByPlaceholderText(/scan or enter imei/i), '123456789012345');
    await user.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(mockLookupTac).toHaveBeenCalledWith('12345678');
      expect(toastSuccess).toHaveBeenCalledWith('✓ Apple iPhone 15 Pro added');
    });
  });

  it('shows warning toast for duplicate IMEI scan', async () => {
    const user = userEvent.setup();

    renderWithProviders(<BookInStock />);

    await user.selectOptions(getSupplierSelect(), '1');
    const imeiInput = screen.getByPlaceholderText(/scan or enter imei/i);

    await user.type(imeiInput, '123456789012345');
    await user.click(screen.getByRole('button', { name: /add device/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());

    await user.type(imeiInput, '123456789012345');
    await user.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(toastDefault).toHaveBeenCalledWith('IMEI already scanned', { icon: '⚠️' });
    });
  });

  it('shows toast.error when trying to scan without supplier', async () => {
    const user = userEvent.setup();

    renderWithProviders(<BookInStock />);

    const imeiInput = screen.getByPlaceholderText(/scan or enter imei/i) as HTMLInputElement;
    imeiInput.disabled = false;

    await user.type(imeiInput, '123456789012345');
    fireEvent.keyDown(imeiInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Please select a supplier first');
    });
  });

  it('shows toast.error when TAC lookup misses', async () => {
    const user = userEvent.setup();

    mockLookupTac.mockResolvedValueOnce({ success: false });

    renderWithProviders(<BookInStock />);

    await user.selectOptions(getSupplierSelect(), '1');
    await user.type(screen.getByPlaceholderText(/scan or enter imei/i), '123456789012345');
    await user.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Device not found in TAC database');
    });
  });

  it('shows toast.error for Zod validation failures on booking', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    const { container } = renderWithProviders(<BookInStock />);

    await user.selectOptions(getSupplierSelect(), '1');
    await user.type(screen.getByPlaceholderText(/scan or enter imei/i), '123456789012345');
    await user.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: /booking complete/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Location is required');
      expect(mockBookIn).not.toHaveBeenCalled();
    });

    expect(container.querySelector('.fixed.top-4.right-4.z-50.space-y-2')).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
