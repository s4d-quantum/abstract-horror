import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useSupplier,
    useUpdateSupplier,
    useDeleteSupplier,
    useDeactivateSupplier,
    useReactivateSupplier
} from '../hooks/useSuppliers';
import { getApiErrorMessage } from '../lib/errors';

export default function SupplierDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useSupplier(id);
    const updateSupplier = useUpdateSupplier();
    const deactivateSupplier = useDeactivateSupplier();
    const reactivateSupplier = useReactivateSupplier();
    const deleteSupplier = useDeleteSupplier();

    const supplier = data?.supplier;

    const [formData, setFormData] = useState({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postcode: '',
        country: 'United Kingdom',
        phone: '',
        email: '',
        vat_number: ''
    });

    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name || '',
                address_line1: supplier.addressLine1 || '',
                address_line2: supplier.addressLine2 || '',
                city: supplier.city || '',
                postcode: supplier.postcode || '',
                country: supplier.country || 'United Kingdom',
                phone: supplier.phone || '',
                email: supplier.email || '',
                vat_number: supplier.vatNumber || ''
            });
        }
    }, [supplier]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Supplier name is required');
            return;
        }

        try {
            await updateSupplier.mutateAsync({
                id,
                data: formData
            });
            toast.success('Supplier updated successfully');
            setHasChanges(false);
        } catch (error) {
            toast.error(`Failed to update supplier: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate this supplier?')) {
            return;
        }

        try {
            await deactivateSupplier.mutateAsync(id);
            toast.success('Supplier deactivated successfully');
            navigate('/suppliers');
        } catch (error) {
            toast.error(`Failed to deactivate supplier: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleReactivate = async () => {
        if (!confirm('Are you sure you want to reactivate this supplier?')) {
            return;
        }

        try {
            await reactivateSupplier.mutateAsync(id);
            toast.success('Supplier reactivated successfully');
            navigate('/suppliers');
        } catch (error) {
            toast.error(`Failed to reactivate supplier: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to permanently delete this supplier? This cannot be undone.')) {
            return;
        }

        try {
            await deleteSupplier.mutateAsync(id);
            toast.success('Supplier deleted successfully');
            navigate('/suppliers');
        } catch (error) {
            toast.error(`Failed to delete supplier: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleCancel = () => {
        if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        navigate('/suppliers');
    };

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Loading supplier...</p>
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Supplier not found</p>
                <Link to="/suppliers" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
                    Back to Suppliers
                </Link>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link
                    to="/suppliers"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Suppliers
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                        <p className="text-gray-600 mt-1">
                            Supplier Code: <span className="font-mono font-semibold">{supplier.supplierCode}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`badge ${supplier.isActive ? 'badge-success' : 'badge-gray'}`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier Name <span className="text-red-500">*</span>
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
                    </div>
                </div>

                {/* Metadata */}
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <span className="font-medium">Created At:</span>{' '}
                            {new Date(supplier.createdAt).toLocaleString()}
                        </div>
                        <div>
                            <span className="font-medium">Last Updated:</span>{' '}
                            {new Date(supplier.updatedAt).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {supplier.isActive ? (
                            <button
                                type="button"
                                onClick={handleDeactivate}
                                className="btn btn-secondary"
                                disabled={deactivateSupplier.isPending || reactivateSupplier.isPending || deleteSupplier.isPending}
                            >
                                {deactivateSupplier.isPending ? 'Deactivating...' : 'Deactivate Supplier'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleReactivate}
                                className="btn btn-secondary"
                                disabled={deactivateSupplier.isPending || reactivateSupplier.isPending || deleteSupplier.isPending}
                            >
                                {reactivateSupplier.isPending ? 'Reactivating...' : 'Reactivate Supplier'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="btn btn-danger flex items-center gap-2"
                            disabled={deactivateSupplier.isPending || reactivateSupplier.isPending || deleteSupplier.isPending}
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleteSupplier.isPending ? 'Deleting...' : 'Delete Supplier'}
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
                            disabled={updateSupplier.isPending || !hasChanges}
                        >
                            <Save className="w-4 h-4" />
                            {updateSupplier.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
