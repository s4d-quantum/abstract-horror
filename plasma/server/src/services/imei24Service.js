import axios from 'axios';

/**
 * IMEI24 External API Service
 * Handles communication with IMEI24 API for device color/spec lookups
 */

export class Imei24Service {
    constructor() {
        this.endpoint = process.env.COLOR_CHECK_EXTERNAL_ENDPOINT;
        this.login = process.env.COLOR_CHECK_EXTERNAL_LOGIN;
        this.key = process.env.COLOR_CHECK_EXTERNAL_KEY;
        this.serviceId = process.env.COLOR_CHECK_EXTERNAL_SERVICE_ID || '487';
    }

    /**
     * Fetch device data from IMEI24 API
     * @param {string} imei - IMEI number
     * @returns {Promise<Object>} - {success, data, credits, message}
     */
    async fetchDeviceData(imei) {
        if (!this.endpoint || !this.login || !this.key) {
            throw new Error('IMEI24 API credentials not configured');
        }

        try {
            const url = `${this.endpoint}?login=${encodeURIComponent(this.login)}&apikey=${encodeURIComponent(this.key)}&action=placeorder&imei=${encodeURIComponent(imei)}&id=${this.serviceId}`;

            const response = await axios.get(url, {
                timeout: 30000
            });

            const data = response.data;

            // Check for API errors
            if (!data.STATUS || data.STATUS.toLowerCase() !== 'ok') {
                return {
                    success: false,
                    message: data.MESSAGE || 'Unknown error from IMEI24 API',
                    data: null
                };
            }

            // Parse results
            const parsedData = this.parseResults(data.RESULTS || '');
            parsedData.imei_1 = parsedData.imei_1 || imei;

            return {
                success: true,
                data: parsedData,
                credits: data.CREDIT || null,
                message: ''
            };
        } catch (error) {
            if (error.response) {
                return {
                    success: false,
                    message: `IMEI24 API responded with HTTP ${error.response.status}`,
                    data: null
                };
            }

            return {
                success: false,
                message: error.message || 'Request to IMEI24 API failed',
                data: null
            };
        }
    }

    /**
     * Parse IMEI24 results string into key-value object
     * @param {string} results - Results string from API (key:value pairs separated by newlines)
     * @returns {Object} - Parsed data object
     */
    parseResults(results) {
        const parsed = {};

        // Replace various <br> tags with newlines
        const normalized = results
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<BR\s*\/?>/g, '\n');

        // Remove any remaining HTML tags
        const cleaned = normalized.replace(/<[^>]*>/g, '');

        // Split into lines
        const lines = cleaned.split(/\r?\n/);

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === '') {
                continue;
            }

            // Split by colon or semicolon
            const parts = trimmed.split(/[:;]/);

            if (parts.length < 2) {
                continue;
            }

            const key = this.normalizeKey(parts[0]);
            if (key === '') {
                continue;
            }

            const value = parts.slice(1).join(':').trim();
            parsed[key] = value;
        }

        return parsed;
    }

    /**
     * Normalize result key to snake_case
     * @param {string} key - Original key
     * @returns {string} - Normalized key
     */
    normalizeKey(key) {
        return key
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}

export default new Imei24Service();
