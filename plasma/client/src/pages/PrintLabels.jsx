import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { printBatchLabels, printSingleLabel } from '../api/admin';
import { getApiErrorMessage } from '../lib/errors';

export default function PrintLabels() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('manual');
    const [imei, setImei] = useState('');
    const [file, setFile] = useState(null);
    const [recentPrints, setRecentPrints] = useState([]);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleManualPrint = async (e) => {
        e.preventDefault();
        setPrinting(true);
        setError('');
        setSuccess('');

        try {
            const response = await printSingleLabel({ imei });

            if (response.success) {
                setSuccess('Label printed successfully');
                setRecentPrints([
                    {
                        imei: response.imei,
                        device: response.device_info,
                        status: 'Printed',
                        time: new Date().toLocaleTimeString()
                    },
                    ...recentPrints
                ]);
                setImei('');
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Print failed'));
        } finally {
            setPrinting(false);
        }
    };

    const handleBatchPrint = async (e) => {
        e.preventDefault();
        setPrinting(true);
        setError('');
        setSuccess('');

        try {
            const reader = new FileReader();

            const fileData = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const ext = file.name.split('.').pop().toLowerCase();
            const fileType = ext === 'xlsx' ? 'xlsx' : 'csv';

            const response = await printBatchLabels({
                file_data: fileData,
                file_type: fileType
            });

            if (response.success) {
                setSuccess(`Printed ${response.printed} labels successfully`);
                if (response.failed > 0) {
                    setError(`Failed to print ${response.failed} labels`);
                }
                setFile(null);
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Batch print failed'));
        } finally {
            setPrinting(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Label Print</h1>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                {/* Tabs */}
                <div className="border-b">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-6 py-3 border-b-2 font-medium ${activeTab === 'manual'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Manual Entry
                        </button>
                        <button
                            onClick={() => setActiveTab('csv')}
                            className={`px-6 py-3 border-b-2 font-medium ${activeTab === 'csv'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            CSV Upload
                        </button>
                        <button
                            onClick={() => setActiveTab('xlsx')}
                            className={`px-6 py-3 border-b-2 font-medium ${activeTab === 'xlsx'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            XLSX Upload
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {/* Manual Entry Tab */}
                    {activeTab === 'manual' && (
                        <div>
                            <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-4">
                                <p className="text-blue-800">Enter or scan an IMEI number to print a label</p>
                            </div>
                            <form onSubmit={handleManualPrint}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">IMEI Number</label>
                                    <input
                                        type="text"
                                        value={imei}
                                        onChange={(e) => setImei(e.target.value)}
                                        placeholder="Enter or scan IMEI"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={printing}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                                >
                                    {printing ? 'Printing...' : '🖨️ Print Label'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* CSV Upload Tab */}
                    {activeTab === 'csv' && (
                        <div>
                            <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-4">
                                <p className="text-blue-800">Upload a CSV file with IMEI numbers</p>
                            </div>
                            <form onSubmit={handleBatchPrint}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">CSV File</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        accept=".csv"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Upload a CSV file containing IMEI numbers</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={printing}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                                >
                                    {printing ? 'Printing...' : '📤 Upload and Print'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* XLSX Upload Tab */}
                    {activeTab === 'xlsx' && (
                        <div>
                            <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-4">
                                <p className="text-blue-800">Upload an XLSX file with IMEI numbers in the 2nd column</p>
                            </div>
                            <form onSubmit={handleBatchPrint}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">XLSX File</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        accept=".xlsx"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Upload an XLSX file with IMEI numbers in the 2nd column</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={printing}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
                                >
                                    {printing ? 'Printing...' : '📤 Upload and Print'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Prints */}
            {recentPrints.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold">Recent Labels</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IMEI</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentPrints.map((print, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-2 text-sm font-mono">{print.imei}</td>
                                        <td className="px-4 py-2 text-sm">{print.device}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                {print.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">{print.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <button
                    onClick={() => navigate('/admin-ops')}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                    Back to Admin Ops
                </button>
            </div>
        </div>
    );
}
