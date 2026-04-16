import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { runColorCheck } from '../api/admin';
import { getApiErrorMessage } from '../lib/errors';

export default function ColorCheck() {
    const navigate = useNavigate();
    const [imeisText, setImeisText] = useState('');
    const [file, setFile] = useState(null);
    const [results, setResults] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults([]);
        setStatistics(null);

        try {
            let fileData = null;
            let fileType = null;

            if (file) {
                const reader = new FileReader();
                fileData = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const ext = file.name.split('.').pop().toLowerCase();
                fileType = ext === 'xlsx' ? 'xlsx' : 'csv';
            }

            const response = await runColorCheck({
                imeis_text: imeisText,
                file_data: fileData,
                file_type: fileType
            });

            if (response.success) {
                setResults(response.results);
                setStatistics(response.statistics);

                if (response.skipped && response.skipped.length > 0) {
                    setError(`Skipped ${response.skipped.length} invalid entries`);
                }
            }
        } catch (error) {
            setError(getApiErrorMessage(error, 'Color check failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Color Check</h1>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Lookup IMEI Colors</h2>

                {error && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            IMEI numbers (one per line, comma, or space separated)
                        </label>
                        <textarea
                            value={imeisText}
                            onChange={(e) => setImeisText(e.target.value)}
                            rows="6"
                            placeholder="Enter IMEI numbers here..."
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Or upload a CSV or XLSX file (IMEIs in Column B)
                        </label>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".csv,.xlsx"
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload a file with IMEI numbers in column B</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {loading ? 'Looking up...' : 'Lookup IMEI Details'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/admin-ops')}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Back to Admin Ops
                        </button>
                    </div>
                </form>
            </div>

            {/* Statistics */}
            {statistics && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-3">Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-3 rounded">
                            <div className="text-2xl font-bold">{statistics.total}</div>
                            <div className="text-sm text-gray-600">Total Lookups</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                            <div className="text-2xl font-bold text-green-600">{statistics.internal_api}</div>
                            <div className="text-sm text-gray-600">Cache Hits</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                            <div className="text-2xl font-bold text-blue-600">{statistics.external_api}</div>
                            <div className="text-sm text-gray-600">External API Calls</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h3 className="text-lg font-semibold">Results</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IMEI</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchase Color</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.map((result, idx) => (
                                    <tr key={idx} className={result.error ? 'bg-red-50' : ''}>
                                        <td className="px-4 py-2 text-sm font-mono">{result.imei}</td>
                                        <td className="px-4 py-2 text-sm">{result.manufacturer || '-'}</td>
                                        <td className="px-4 py-2 text-sm">{result.model || '-'}</td>
                                        <td className="px-4 py-2 text-sm">{result.color || '-'}</td>
                                        <td className="px-4 py-2 text-sm">{result.purchase_color || '-'}</td>
                                        <td className="px-4 py-2 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs ${result.source === 'Local cache' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {result.source || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                            {result.error ? (
                                                <span className="text-red-600">{result.error}</span>
                                            ) : (
                                                result.status
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
