import axios from 'axios';

/**
 * Ideal Postcodes API Service
 * Handles UK address validation and postcode lookups
 */
class IdealPostcodesService {
    constructor() {
        this.apiKey = process.env.IDEAL_POSTCODES_API_KEY;
        this.baseUrl = 'https://api.ideal-postcodes.co.uk/v1';

        if (!this.apiKey) {
            throw new Error('IDEAL_POSTCODES_API_KEY environment variable is required');
        }
    }

    /**
     * Validate and lookup a UK postcode
     * @param {string} postcode - UK postcode to validate
     * @returns {Array} Array of addresses matching the postcode
     */
    async lookupPostcode(postcode) {
        try {
            const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, '');
            const url = `${this.baseUrl}/postcodes/${encodeURIComponent(cleanPostcode)}`;

            console.log(`[IdealPostcodes] Looking up postcode: ${cleanPostcode}`);

            const response = await axios.get(url, {
                params: {
                    api_key: this.apiKey
                },
                timeout: 10000
            });

            if (response.data.result && Array.isArray(response.data.result)) {
                console.log(`[IdealPostcodes] Found ${response.data.result.length} addresses for postcode ${cleanPostcode}`);
                return response.data.result;
            }

            return [];
        } catch (error) {
            console.error('[IdealPostcodes] Postcode lookup error:', error.message);

            if (error.response && error.response.status === 404) {
                throw new Error(`Postcode not found: ${postcode}`);
            }

            throw error;
        }
    }

    /**
     * Clean and validate an address
     * @param {Object} addressData - Raw address data from BackMarket
     * @returns {Object} Cleaned and validated address
     */
    async validateAddress(addressData) {
        try {
            const { street, street2, city, postal_code, country } = addressData;

            // Only validate UK addresses
            if (country && country !== 'GB') {
                console.log(`[IdealPostcodes] Skipping non-UK address (${country})`);
                return {
                    validated: false,
                    original: addressData,
                    cleaned: addressData,
                    message: 'Non-UK address - validation skipped'
                };
            }

            if (!postal_code) {
                throw new Error('Postcode is required for address validation');
            }

            // Lookup postcode
            const addresses = await this.lookupPostcode(postal_code);

            if (addresses.length === 0) {
                return {
                    validated: false,
                    original: addressData,
                    cleaned: addressData,
                    message: 'No addresses found for postcode'
                };
            }

            // Try to match the address
            const matchedAddress = this._findBestMatch(addresses, street, city);

            if (matchedAddress) {
                const cleaned = this._formatAddress(matchedAddress);

                return {
                    validated: true,
                    confidence: 'high',
                    original: addressData,
                    cleaned: cleaned,
                    message: 'Address validated and cleaned'
                };
            }

            // If no exact match, use the first result as suggestion
            const cleaned = this._formatAddress(addresses[0]);

            return {
                validated: true,
                confidence: 'medium',
                original: addressData,
                cleaned: cleaned,
                message: 'Address cleaned using postcode lookup (no exact match)'
            };

        } catch (error) {
            console.error('[IdealPostcodes] Address validation error:', error.message);

            return {
                validated: false,
                error: error.message,
                original: addressData,
                cleaned: addressData,
                message: `Validation failed: ${error.message}`
            };
        }
    }

    /**
     * Find best matching address from results
     */
    _findBestMatch(addresses, street, city) {
        const streetLower = (street || '').toLowerCase().trim();
        const cityLower = (city || '').toLowerCase().trim();

        for (const address of addresses) {
            const addressLine1 = (address.line_1 || '').toLowerCase();
            const postTown = (address.post_town || '').toLowerCase();

            // Check if street matches
            if (streetLower && addressLine1.includes(streetLower)) {
                return address;
            }

            // Check if city matches
            if (cityLower && postTown.includes(cityLower)) {
                return address;
            }
        }

        return null;
    }

    /**
     * Format address data from Ideal Postcodes response
     */
    _formatAddress(idealPostcodesAddress) {
        return {
            line_1: idealPostcodesAddress.line_1 || '',
            line_2: idealPostcodesAddress.line_2 || '',
            line_3: idealPostcodesAddress.line_3 || '',
            post_town: idealPostcodesAddress.post_town || '',
            county: idealPostcodesAddress.county || '',
            postcode: idealPostcodesAddress.postcode || '',
            country: 'GB',
            // Additional fields for DPD
            street: idealPostcodesAddress.line_1 || '',
            locality: idealPostcodesAddress.line_2 || '',
            city: idealPostcodesAddress.post_town || '',
            postal_code: idealPostcodesAddress.postcode || ''
        };
    }

    /**
     * Get address suggestions (autocomplete)
     * @param {string} query - Partial address or postcode
     * @returns {Array} Address suggestions
     */
    async autocomplete(query) {
        try {
            const url = `${this.baseUrl}/autocomplete/addresses`;

            const response = await axios.get(url, {
                params: {
                    api_key: this.apiKey,
                    query: query
                },
                timeout: 10000
            });

            if (response.data.result && response.data.result.hits) {
                return response.data.result.hits;
            }

            return [];
        } catch (error) {
            console.error('[IdealPostcodes] Autocomplete error:', error.message);
            return [];
        }
    }
}

export default new IdealPostcodesService();
