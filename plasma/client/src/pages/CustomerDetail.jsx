import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useCustomer,
    useUpdateCustomer,
    useDeleteCustomer,
    useDeactivateCustomer,
    useReactivateCustomer
} from '../hooks/useCustomers';
import { getApiErrorMessage } from '../lib/errors';

export default function CustomerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useCustomer(id);
    const updateCustomer = useUpdateCustomer();
    const deactivateCustomer = useDeactivateCustomer();
    const reactivateCustomer = useReactivateCustomer();
    const deleteCustomer = useDeleteCustomer();

    const customer = data?.customer;

    const [formData, setFormData] = useState({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        phone: '',
        email: '',
        vat_number: '',
        is_backmarket: false
    });

    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                address_line1: customer.addressLine1 || '',
                address_line2: customer.addressLine2 || '',
                city: customer.city || '',
                postcode: customer.postcode || '',
                country: customer.country || 'United Kingdom',
                phone: customer.phone || '',
                email: customer.email || '',
                vat_number: customer.vatNumber || '',
                is_backmarket: customer.isBackmarket || false
            });
        }
    }, [customer]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setHasChanges(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Customer name is required');
            return;
        }

        try {
            await updateCustomer.mutateAsync({
                id,
                data: formData
            });
            toast.success('Customer updated successfully');
            setHasChanges(false);
        } catch (error) {
            toast.error(`Failed to update customer: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate this customer?')) {
            return;
        }

        try {
            await deactivateCustomer.mutateAsync(id);
            toast.success('Customer deactivated successfully');
            navigate('/customers');
        } catch (error) {
            toast.error(`Failed to deactivate customer: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to permanently delete this customer? This cannot be undone.')) {
            return;
        }

        try {
            await deleteCustomer.mutateAsync(id);
            toast.success('Customer deleted successfully');
            navigate('/customers');
        } catch (error) {
            toast.error(`Failed to delete customer: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleReactivate = async () => {
        if (!confirm('Are you sure you want to reactivate this customer?')) {
            return;
        }

        try {
            await reactivateCustomer.mutateAsync(id);
            toast.success('Customer reactivated successfully');
            navigate('/customers');
        } catch (error) {
            toast.error(`Failed to reactivate customer: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleCancel = () => {
        if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        navigate('/customers');
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Loading customer...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Customer not found</p>
                <Link to="/customers" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                    Back to Customers
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    to="/customers"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Customers
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                        <p className="text-gray-600 mt-1">
                            Customer Code: <span className="font-mono font-semibold">{customer.customerCode}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {customer.isBackmarket && (
                            <span className="badge badge-info">Backmarket</span>
                        )}
                        <span className={`badge ${customer.isActive ? 'badge-success' : 'badge-gray'}`}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>

                        {/* Address Line 1 */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address Line 1
                            </label>
                            <input
                                type="text"
                                name="address_line1"
                                value={formData.address_line1}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* Address Line 2 */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address Line 2
                            </label>
                            <input
                                type="text"
                                name="address_line2"
                                value={formData.address_line2}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* Postcode */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Postcode
                            </label>
                            <input
                                type="text"
                                name="postcode"
                                value={formData.postcode}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* VAT Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                VAT Number
                            </label>
                            <input
                                type="text"
                                name="vat_number"
                                value={formData.vat_number}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        {/* Backmarket Flag */}
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="is_backmarket"
                                    checked={formData.is_backmarket}
                                    onChange={handleChange}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Backmarket Consumer Account
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Metadata */}
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <span className="font-medium">Created At:</span>{' '}
                            {new Date(customer.createdAt).toLocaleString()}
                        </div>
                        <div>
                            <span className="font-medium">Last Updated:</span>{' '}
                            {new Date(customer.updatedAt).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {customer.isActive ? (
                            <button
                                type="button"
                                onClick={handleDeactivate}
                                className="btn btn-secondary"
                                disabled={deactivateCustomer.isPending || reactivateCustomer.isPending || deleteCustomer.isPending}
                            >
                                {deactivateCustomer.isPending ? 'Deactivating...' : 'Deactivate Customer'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleReactivate}
                                className="btn btn-secondary"
                                disabled={deactivateCustomer.isPending || reactivateCustomer.isPending || deleteCustomer.isPending}
                            >
                                {reactivateCustomer.isPending ? 'Reactivating...' : 'Reactivate Customer'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="btn btn-danger flex items-center gap-2"
                            disabled={deactivateCustomer.isPending || reactivateCustomer.isPending || deleteCustomer.isPending}
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleteCustomer.isPending ? 'Deleting...' : 'Delete Customer'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex items-center gap-2"
                            disabled={updateCustomer.isPending || !hasChanges}
                        >
                            <Save className="w-4 h-4" />
                            {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
