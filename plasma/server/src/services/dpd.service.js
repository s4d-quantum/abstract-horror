import axios from 'axios';

/**
 * DPD Shipping Service
 * Handles DPD shipment booking via GeoSession API and label retrieval via MyShipments API
 */
class DPDService {
    constructor() {
        // GeoSession API credentials
        this.loginUrl = process.env.DPD_LOGIN_URL;
        this.shipmentUrl = process.env.DPD_SHIPMENT_URL;
        this.authHeader = process.env.DPD_AUTH_HEADER;
        this.geoClient = process.env.DPD_GEOCLIENT;

        // MyShipments API credentials
        this.myshipLoginUrl = process.env.MYSHIP_LOGIN_URL;
        this.myshipShipmentsUrl = process.env.MYSHIP_SHIPMENTS_URL;
        this.myshipEmail = process.env.MYSHIP_EMAIL;
        this.myshipPass = process.env.MYSHIP_PASS;

        // Print webhook
        this.printWebhookUrl = process.env.PRINT_WEBHOOK_URL;
        this.printApiKey = process.env.PRINT_API_KEY;

        this._validateConfig();
    }

    _validateConfig() {
        const required = [
            'DPD_LOGIN_URL',
            'DPD_SHIPMENT_URL',
            'DPD_AUTH_HEADER',
            'DPD_GEOCLIENT',
            'MYSHIP_LOGIN_URL',
            'MYSHIP_SHIPMENTS_URL',
            'MYSHIP_EMAIL',
            'MYSHIP_PASS',
            'PRINT_WEBHOOK_URL',
            'PRINT_API_KEY'
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required DPD environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Login to GeoSession API
     * @returns {string} GeoSession token
     */
    async loginGeoSession() {
        try {
            console.log('[DPD] Logging into GeoSession API');

            const response = await axios.post(this.loginUrl, null, {
                headers: {
                    'Authorization': this.authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!response.data || !response.data.data || !response.data.data.geoSession) {
                throw new Error('GeoSession token not found in response');
            }

            const geoSession = response.data.data.geoSession;
            console.log('[DPD] Successfully logged into GeoSession');

            return geoSession;
        } catch (error) {
            console.error('[DPD] GeoSession login error:', error.message);
            throw new Error(`DPD login failed: ${error.message}`);
        }
    }

    /**
     * Calculate collection date based on cutoff time
     * @param {string} cutoffTime - Cutoff time in HH:MM format (default: 13:30)
     * @returns {string} Collection date in ISO format
     */
    _calculateCollectionDate(cutoffTime = '13:30') {
        const now = new Date();
        const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

        const cutoff = new Date();
        cutoff.setHours(cutoffHour, cutoffMinute, 0, 0);

        let collectionDate;

        if (now < cutoff) {
            // Before cutoff - collection today at 15:30
            collectionDate = new Date();
        } else {
            // After cutoff - collection tomorrow at 15:30
            collectionDate = new Date();
            collectionDate.setDate(collectionDate.getDate() + 1);
        }

        collectionDate.setHours(15, 30, 0, 0);

        return collectionDate.toISOString();
    }

    /**
     * Book DPD shipment
     */
    async bookShipment(geoSession, deliveryAddress, contactDetails, orderValue, reference) {
        try {
            console.log(`[DPD] Booking shipment for reference: ${reference}`);

            const { first_name, last_name, phone, email } = contactDetails;
            const contactName = `${first_name} ${last_name}`.trim();

            // Build delivery address
            const address = {
                organisation: contactName,
                countryCode: 'GB',
                postcode: deliveryAddress.postal_code || deliveryAddress.postcode,
                addressLine1: deliveryAddress.street || deliveryAddress.line_1,
                street: deliveryAddress.street || deliveryAddress.line_1,
                town: deliveryAddress.city || deliveryAddress.post_town
            };

            if (deliveryAddress.county) {
                address.county = deliveryAddress.county;
            }

            if (deliveryAddress.locality || deliveryAddress.line_2) {
                address.locality = deliveryAddress.locality || deliveryAddress.line_2;
            }

            // Calculate liability
            const liability = orderValue > 499;
            const liabilityValue = liability ? orderValue : 0;

            const collectionDate = this._calculateCollectionDate();

            const payload = {
                collectionDate: collectionDate,
                consolidate: true,
                consignment: [{
                    consignmentRef: reference,
                    collectionDetails: {
                        contactDetails: {
                            contactName: 'S4D Warehouse',
                            telephone: '01782 330780'
                        },
                        address: {
                            organisation: 'S4D Ltd',
                            countryCode: 'GB',
                            postcode: 'ST3 5XA',
                            street: 'Parkhall Road',
                            town: 'Stoke on Trent',
                            county: 'Staffordshire'
                        }
                    },
                    deliveryDetails: {
                        contactDetails: {
                            contactName: contactName,
                            telephone: phone
                        },
                        address: address,
                        notificationDetails: {
                            email: email,
                            mobile: phone
                        }
                    },
                    networkCode: '2^13', // DPD Next Day
                    numberOfParcels: 1,
                    totalWeight: 1.0,
                    parcelDescription: 'Mobile Phone',
                    liability: liability,
                    liabilityValue: liabilityValue
                }]
            };

            const response = await axios.post(this.shipmentUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'GeoClient': this.geoClient,
                    'GeoSession': geoSession
                },
                timeout: 30000
            });

            if (!response.data || !response.data.data) {
                throw new Error('Invalid response from DPD API');
            }

            const data = response.data.data;

            if (!data.shipmentId) {
                throw new Error('Shipment ID not found in response');
            }

            if (!data.consignmentDetail || data.consignmentDetail.length === 0) {
                throw new Error('Consignment detail not found in response');
            }

            const consignmentDetail = data.consignmentDetail[0];

            if (!consignmentDetail.consignmentNumber) {
                throw new Error('Consignment number not found');
            }

            if (!consignmentDetail.parcelNumbers || consignmentDetail.parcelNumbers.length === 0) {
                throw new Error('Parcel number not found');
            }

            const result = {
                shipmentId: data.shipmentId,
                consignmentNumber: consignmentDetail.consignmentNumber,
                parcelNumber: consignmentDetail.parcelNumbers[0]
            };

            console.log(`[DPD] Shipment booked successfully:`, result);

            return result;
        } catch (error) {
            console.error('[DPD] Shipment booking error:', error.message);

            if (error.response) {
                console.error('[DPD] Response data:', error.response.data);
            }

            throw new Error(`DPD booking failed: ${error.message}`);
        }
    }

    /**
     * Login to MyShipments API
     * @returns {string} Cookie string for authentication
     */
    async loginMyShipments() {
        try {
            console.log('[DPD] Logging into MyShipments API');

            const response = await axios.post(
                this.myshipLoginUrl,
                {
                    email: this.myshipEmail,
                    password: this.myshipPass
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 15000
                }
            );

            // Extract cookies from Set-Cookie headers
            const setCookieHeaders = response.headers['set-cookie'];

            if (!setCookieHeaders || setCookieHeaders.length === 0) {
                throw new Error('No cookies received from MyShipments login');
            }

            // Parse cookies
            const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');

            console.log('[DPD] Successfully logged into MyShipments');

            return cookies;
        } catch (error) {
            console.error('[DPD] MyShipments login error:', error.message);
            throw new Error(`MyShipments login failed: ${error.message}`);
        }
    }

    /**
     * Find shipment UUID in MyShipments
     * Retries with delays as DPD takes time to process new shipments
     */
    async findShipmentUUID(cookies, consignmentNumber, maxRetries = 5) {
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                attempt++;
                console.log(`[DPD] Searching for consignment ${consignmentNumber} (attempt ${attempt}/${maxRetries})`);

                // Add delay on retry attempts (not on first attempt)
                if (attempt > 1) {
                    const delayMs = attempt * 2000; // 2s, 4s, 6s, 8s
                    console.log(`[DPD] Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }

                // Get first page to determine total results
                const firstPageUrl = `${this.myshipShipmentsUrl}?searchPage=1`;
                const firstPageResponse = await axios.get(firstPageUrl, {
                    headers: {
                        'Cookie': cookies,
                        'Accept': 'application/json'
                    },
                    timeout: 15000
                });

                if (!firstPageResponse.data || !firstPageResponse.data.data) {
                    throw new Error('Invalid response from MyShipments');
                }

                const totalResults = firstPageResponse.data.data.totalResults || 0;
                const resultsPerPage = firstPageResponse.data.data.results?.length || 20;
                const lastPage = Math.ceil(totalResults / resultsPerPage);

                console.log(`[DPD] Searching ${totalResults} shipments across ${lastPage} pages`);

                // Search from last page backwards (most recent first)
                for (let page = lastPage; page >= 1; page--) {
                    const url = `${this.myshipShipmentsUrl}?searchPage=${page}`;

                    const response = await axios.get(url, {
                        headers: {
                            'Cookie': cookies,
                            'Accept': 'application/json'
                        },
                        timeout: 15000
                    });

                    const shipments = response.data.data.results || [];

                    for (const shipment of shipments) {
                        const outbound = shipment.outboundConsignment || {};

                        if (outbound.consignmentNumber === consignmentNumber) {
                            const uuid = shipment.shipmentId;
                            console.log(`[DPD] Found UUID ${uuid} for consignment ${consignmentNumber}`);
                            return uuid;
                        }
                    }
                }

                // Not found on this attempt
                if (attempt < maxRetries) {
                    console.log(`[DPD] Consignment not found yet, will retry...`);
                } else {
                    throw new Error(`Consignment ${consignmentNumber} not found after ${maxRetries} attempts`);
                }

            } catch (error) {
                if (attempt >= maxRetries) {
                    console.error('[DPD] Error finding shipment UUID:', error.message);
                    throw error;
                }
                // Continue to next retry
            }
        }
    }

    /**
     * Retrieve ZPL label from MyShipments
     */
    async retrieveLabel(cookies, uuid, parcelNumber) {
        try {
            console.log(`[DPD] Retrieving label for UUID ${uuid}, parcel ${parcelNumber}`);

            const url = `${this.myshipShipmentsUrl}/${uuid}/labels?parcelNumbers=${parcelNumber}&printerType=3`;

            const response = await axios.get(url, {
                headers: {
                    'Cookie': cookies
                },
                timeout: 15000,
                responseType: 'text'
            });

            let zplData = response.data;

            // Ensure ZPL ends with ^XZ
            if (!zplData.match(/\^XZ\s*$/)) {
                zplData = zplData.trim() + '\n^XZ\n';
            }

            console.log(`[DPD] Successfully retrieved ZPL label (${zplData.length} bytes)`);

            return zplData;
        } catch (error) {
            console.error('[DPD] Error retrieving label:', error.message);
            throw error;
        }
    }

    /**
     * Send ZPL label to print webhook
     */
    async sendLabelToPrinter(zplData) {
        try {
            console.log('[DPD] Sending label to print webhook');

            const response = await axios.post(this.printWebhookUrl, zplData, {
                headers: {
                    'X-API-Key': this.printApiKey,
                    'Content-Type': 'text/plain'
                },
                timeout: 15000
            });

            console.log('[DPD] Label sent to printer successfully');

            return response.data;
        } catch (error) {
            console.error('[DPD] Error sending label to printer:', error.message);
            throw error;
        }
    }

    /**
     * Complete DPD booking workflow
     */
    async completeBookingWorkflow(deliveryAddress, contactDetails, orderValue, reference) {
        try {
            // Step 1: Login to GeoSession
            const geoSession = await this.loginGeoSession();

            // Step 2: Book shipment
            const shipmentData = await this.bookShipment(
                geoSession,
                deliveryAddress,
                contactDetails,
                orderValue,
                reference
            );

            // Step 3: Login to MyShipments
            const cookies = await this.loginMyShipments();

            // Step 4: Find shipment UUID
            const uuid = await this.findShipmentUUID(cookies, shipmentData.consignmentNumber);

            // Step 5: Retrieve label
            const zplData = await this.retrieveLabel(cookies, uuid, shipmentData.parcelNumber);

            // Step 6: Send to printer
            await this.sendLabelToPrinter(zplData);

            return {
                ...shipmentData,
                uuid,
                labelZpl: zplData,
                labelPrinted: true
            };
        } catch (error) {
            console.error('[DPD] Complete booking workflow error:', error.message);
            throw error;
        }
    }
}

export default new DPDService();
