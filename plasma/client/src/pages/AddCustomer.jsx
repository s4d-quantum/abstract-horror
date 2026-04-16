import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateCustomer } from '../hooks/useCustomers';
import { getApiErrorMessage } from '../lib/errors';

export default function AddCustomer() {
    const navigate = useNavigate();
    const createCustomer = useCreateCustomer();

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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Customer name is required');
            return;
        }

        try {
            const result = await createCustomer.mutateAsync(formData);
            toast.success(`Customer created successfully with code: ${result.customerCode}`);
            navigate('/customers');
        } catch (error) {
            toast.error(`Failed to create customer: ${getApiErrorMessage(error, 'Unknown error')}`);
        }
    };

    const handleCancel = () => {
        navigate('/customers');
    };

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
                <h1 className="text-2xl font-bold text-gray-900">Add New Customer</h1>
                <p className="text-gray-600 mt-1">
                    Create a new customer in the system. Customer code will be auto-generated.
                </p>
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
                                placeholder="Enter customer name"
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
                                placeholder="Enter address line 1"
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
                                placeholder="Enter address line 2"
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
                                placeholder="Enter city"
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
                                placeholder="Enter postcode"
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
                                placeholder="Enter country"
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
                                placeholder="Enter phone number"
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
                                placeholder="Enter email address"
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
                                placeholder="Enter VAT number"
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

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
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
                        disabled={createCustomer.isPending}
                    >
                        <Save className="w-4 h-4" />
                        {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
                    </button>
                </div>
            </form>
        </div>
    );
}
