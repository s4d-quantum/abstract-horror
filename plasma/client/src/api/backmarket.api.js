import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('accessToken');
    return { Authorization: `Bearer ${token}` };
};

/**
 * Book BackMarket shipment (automated workflow)
 */
export const bookBackmarketShipment = async (salesOrderId) => {
    const response = await axios.post(
        `${API_BASE}/backmarket/sales-order/${salesOrderId}/book-shipment`,
        {},
        { headers: getAuthHeader() }
    );
    return response.data;
};
