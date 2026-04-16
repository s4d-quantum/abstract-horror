import db, { transaction } from '../config/database.js';
import imei24Service from '../services/imei24Service.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { parseImeisFromText, parseCsvForImeis, parseXlsxForImeis } from '../utils/fileParser.js';

/**
 * Color Check Controller
 * Handles IMEI color lookups with cache-first strategy
 */

/**
 * Check colors for one or more IMEIs
 * POST /api/admin/color-check
 */
export const checkColors = asyncHandler(async (req, res) => {
    const { imeis_text, file_data, file_type } = req.body;

    let allImeis = [];
    let skippedValues = [];

    // Parse IMEIs from text input
    if (imeis_text) {
        const textResult = parseImeisFromText(imeis_text);
        allImeis = allImeis.concat(textResult.imeis);
        skippedValues = skippedValues.concat(textResult.skipped);
    }

    // Parse IMEIs from uploaded file (if provided)
    if (file_data && file_type) {
        const buffer = Buffer.from(file_data, 'base64');

        try {
            let fileResult;
            if (file_type === 'csv') {
                fileResult = await parseCsvForImeis(buffer);
            } else if (file_type === 'xlsx') {
                fileResult = parseXlsxForImeis(buffer);
            } else {
                return errorResponse(res, 'Unsupported file type', 'UNSUPPORTED_FILE_TYPE', 400);
            }

            allImeis = allImeis.concat(fileResult.imeis);
            skippedValues = skippedValues.concat(fileResult.skipped);
        } catch (error) {
            return errorResponse(res, `File parsing error: ${error.message}`, 'FILE_PARSE_ERROR', 400);
        }
    }

    if (allImeis.length === 0) {
        return errorResponse(res, 'No valid IMEIs provided', 'NO_VALID_IMEIS', 400);
    }

    // Remove duplicates
    const uniqueImeis = [...new Set(allImeis)];

    // Process each IMEI
    const results = [];
    const stats = {
        total: uniqueImeis.length,
        internal_api: 0,
        external_api: 0
    };

    for (const imei of uniqueImeis) {
        const result = await processImei(imei, stats);
        results.push(result);
    }

    successResponse(res, {
        results,
        statistics: stats,
        skipped: skippedValues.length > 0 ? skippedValues : null
    });
});

/**
 * Process single IMEI through cache-first lookup
 * @param {string} imei - IMEI number
 * @param {Object} stats - Statistics object to update
 * @returns {Promise<Object>} - Result object
 */
async function processImei(imei, stats) {
    const result = {
        imei,
        manufacturer: null,
        model: null,
        color: null,
        purchase_color: null,
        storage_gb: null,
        source: null,
        status: '',
        notes: [],
        error: null
    };

    try {
        // Get purchase color from devices table
        const [deviceResults] = await db.execute(
            'SELECT color FROM devices WHERE imei = ? LIMIT 1',
            [imei]
        );

        if (deviceResults.length > 0) {
            result.purchase_color = deviceResults[0].color;
        }

        // Check local cache first
        const [cacheResults] = await db.execute(
            'SELECT * FROM color_check_cache WHERE imei = ? LIMIT 1',
            [imei]
        );

        if (cacheResults.length > 0) {
            const cached = cacheResults[0];
            result.manufacturer = cached.manufacturer;
            result.model = cached.model;
            result.color = cached.color;
            result.storage_gb = cached.storage_gb;
            result.source = 'Local cache';
            result.status = 'Found in local cache';
            stats.internal_api++;

            // Update oem_color in devices table (best effort, don't fail if it doesn't work)
            if (result.color) {
                try {
                    await db.execute(
                        'UPDATE devices SET oem_color = ? WHERE imei = ?',
                        [result.color.trim(), imei]
                    );
                } catch (error) {
                    // Silently fail if update doesn't work (device might not exist in our system)
                    console.error(`Failed to update oem_color for IMEI ${imei}:`, error.message);
                }
            }

            return result;
        }

        result.notes.push('Not found in local cache, querying external API...');

        // Fetch from external API
        const externalResult = await imei24Service.fetchDeviceData(imei);

        if (!externalResult.success) {
            result.error = externalResult.message;
            result.status = 'External lookup failed';
            result.source = 'External API';
            return result;
        }

        // Extract data from external API response
        const apiData = externalResult.data;
        result.manufacturer = apiData.manufacturer || apiData.brand || null;
        result.model = apiData.model_name || apiData.model_info || apiData.model || null;
        result.color = apiData.color || null;
        result.storage_gb = apiData.storage_gb || null;
        result.source = 'External API';
        result.status = 'Fetched from external API';
        stats.external_api++;

        if (externalResult.credits) {
            result.notes.push(`Credits used: ${externalResult.credits}`);
        }

        // Store in cache and update device atomically
        try {
            await transaction(async (connection) => {
                // Store in cache for future use
                await connection.execute(
                    `INSERT INTO color_check_cache
               (imei, manufacturer, model, color, storage_gb, raw_response, source, lookup_cost)
               VALUES (?, ?, ?, ?, ?, ?, 'IMEI24', ?)`,
                    [
                        imei,
                        result.manufacturer,
                        result.model,
                        result.color,
                        result.storage_gb,
                        JSON.stringify(apiData),
                        externalResult.credits ? parseFloat(externalResult.credits) : 0
                    ]
                );

                // Update oem_color in devices table if color is available
                if (result.color) {
                    await connection.execute(
                        'UPDATE devices SET oem_color = ? WHERE imei = ?',
                        [result.color.trim(), imei]
                    );
                }
            });

            result.notes.push('Stored in local cache');
        } catch (error) {
            // Don't fail the whole operation if cache storage fails
            console.error(`Failed to store cache/update device for IMEI ${imei}:`, error.message);
            result.notes.push('Warning: Failed to store in cache');
        }

    } catch (error) {
        result.error = error.message;
        result.status = 'Processing error';
    }

    return result;
}
