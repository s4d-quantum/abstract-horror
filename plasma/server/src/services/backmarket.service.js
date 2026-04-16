import axios from 'axios';

/**
 * BackMarket API Service
 * Handles all interactions with BackMarket API
 */
class BackmarketService {
    constructor() {
        this.baseUrl = process.env.BM_API_URL || 'https://www.backmarket.fr/ws/orders';
        this.authHeader = process.env.BM_API_AUTH;

        if (!this.authHeader) {
            throw new Error('BM_API_AUTH environment variable is required');
        }
    }

    /**
     * Create axios instance with BackMarket-specific headers
     */
    _createAxiosInstance() {
        return axios.create({
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${this.authHeader}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            }
        });
    }

    /**
     * Fetch order details from BackMarket API
     * @param {string} orderId - BackMarket order ID
     * @returns {Object} Order details including address, items, price
     */
    async fetchOrderDetails(orderId) {
        try {
            const client = this._createAxiosInstance();
            const url = `${this.baseUrl}/${orderId}`;

            console.log(`[BackMarket] Fetching order ${orderId} from ${url}`);

            const response = await client.get(url);

            if (response.status === 403) {
                throw new Error('Blocked by Cloudflare or authentication failed');
            }

            if (!response.data || !response.data.order_id) {
                throw new Error('Invalid API response: order_id not found');
            }

            console.log(`[BackMarket] Successfully fetched order ${orderId}`);

            return this._parseOrderData(response.data);
        } catch (error) {
            console.error(`[BackMarket] Error fetching order ${orderId}:`, error.message);

            if (error.response) {
                throw new Error(`BackMarket API error: ${error.response.status} - ${error.response.statusText}`);
            }

            throw error;
        }
    }

    /**
     * Parse and structure order data from BM API response
     */
    _parseOrderData(data) {
        const address = data.shipping_address || data.billing_address || {};

        return {
            order_id: data.order_id,
            customer: {
                first_name: address.first_name || '',
                last_name: address.last_name || '',
                company: address.company || '',
                phone: address.phone || '',
                email: address.email || ''
            },
            shipping_address: {
                street: address.street || '',
                street2: address.street2 || '',
                city: address.city || '',
                postal_code: address.postal_code || '',
                country: address.country || 'GB'
            },
            orderlines: data.orderlines || [],
            price: parseFloat(data.price) || 0,
            delivery_note: data.delivery_note || '',
            tracking_number: data.tracking_number || '',
            shipper: data.shipper || '',
            date_creation: data.date_creation,
            date_shipping: data.date_shipping,
            state: data.state
        };
    }

    /**
     * Update BackMarket order status
     * @param {string} orderId - BackMarket order ID
     * @param {number} newState - New order state (2 = processing, 3 = shipped)
     * @param {Object} data - Additional data (SKU, IMEI, tracking, shipper)
     */
    async updateOrderStatus(orderId, newState, data = {}) {
        try {
            const client = this._createAxiosInstance();
            const url = `${this.baseUrl}/${orderId}`;

            const payload = {
                order_id: parseInt(orderId),
                new_state: newState,
                ...data
            };

            console.log(`[BackMarket] Updating order ${orderId} to state ${newState}`);

            const response = await client.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Failed to update order: HTTP ${response.status}`);
            }

            console.log(`[BackMarket] Successfully updated order ${orderId} to state ${newState}`);

            return response.data;
        } catch (error) {
            console.error(`[BackMarket] Error updating order ${orderId}:`, error.message);
            throw error;
        }
    }

    /**
     * Update order with shipping information (state 3)
     * @param {string} orderId - BackMarket order ID
     * @param {string} imei - Device IMEI
     * @param {string} trackingNumber - Courier tracking number
     * @param {string} shipper - Courier name (default: 'DPD UK')
     */
    async updateShippingInfo(orderId, imei, trackingNumber, shipper = 'DPD UK') {
        // First, fetch order to get SKU
        const orderData = await this.fetchOrderDetails(orderId);

        if (!orderData.orderlines || orderData.orderlines.length === 0) {
            throw new Error('No orderlines found in order');
        }

        const sku = orderData.orderlines[0].listing;

        if (!sku) {
            throw new Error('Could not extract SKU from orderlines');
        }

        // Move to state 2 if not already
        if (orderData.state !== 2 && orderData.state !== 3) {
            console.log(`[BackMarket] Moving order ${orderId} to state 2 first`);
            await this.updateOrderStatus(orderId, 2, { sku });
        }

        // Calculate shipping date (tomorrow at 3 PM UTC)
        const shippingDate = new Date();
        shippingDate.setDate(shippingDate.getDate() + 1);
        shippingDate.setHours(15, 0, 0, 0);

        // Update to state 3 with shipping info
        return await this.updateOrderStatus(orderId, 3, {
            imei,
            tracking_number: trackingNumber,
            shipper,
            date_shipping: shippingDate.toISOString()
        });
    }

    /**
     * Download delivery note PDF
     * @param {string} deliveryNoteUrl - URL to delivery note PDF
     * @returns {Buffer} PDF data
     */
    async downloadDeliveryNote(deliveryNoteUrl) {
        try {
            const response = await axios.get(deliveryNoteUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Failed to download delivery note: HTTP ${response.status}`);
            }

            console.log(`[BackMarket] Successfully downloaded delivery note`);

            return Buffer.from(response.data);
        } catch (error) {
            console.error('[BackMarket] Error downloading delivery note:', error.message);
            throw error;
        }
    }
}

export default new BackmarketService();
