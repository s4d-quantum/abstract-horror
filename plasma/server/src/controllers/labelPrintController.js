import db from '../config/database.js';
import axios from 'axios';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import { parseImeisFromText, parseCsvForImeis, parseXlsxForImeis } from '../utils/fileParser.js';

/**
 * Label Print Controller
 * Handles device label printing via webhook
 */

/**
 * Print single label
 * POST /api/admin/print-labels/single
 */
export const printSingleLabel = asyncHandler(async (req, res) => {
    const { imei } = req.body;

    if (!imei) {
        return errorResponse(res, 'IMEI is required', 'MISSING_IMEI', 400);
    }

    // Fetch device data
    const deviceData = await getDeviceData(imei);

    if (!deviceData) {
        return errorResponse(res, `Device not found for IMEI: ${imei}`, 'DEVICE_NOT_FOUND', 404);
    }

    // Send to print webhook
    const printResult = await sendToPrintWebhook(deviceData);

    if (!printResult.success) {
        return errorResponse(res, `Print failed: ${printResult.message}`, 'PRINT_FAILED', 500);
    }

    successResponse(res, {
        imei,
        device_info: `${deviceData.manufacturer} ${deviceData.model} ${deviceData.storage_gb}GB ${deviceData.color}`,
        message: 'Label printed successfully'
    });
});

/**
 * Print batch labels from file
 * POST /api/admin/print-labels/batch
 */
export const printBatchLabels = asyncHandler(async (req, res) => {
    const { file_data, file_type, imeis_text } = req.body;

    let allImeis = [];
    let skipped = [];

    // Parse IMEIs
    if (imeis_text) {
        const textResult = parseImeisFromText(imeis_text);
        allImeis = allImeis.concat(textResult.imeis);
        skipped = skipped.concat(textResult.skipped);
    }

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
            skipped = skipped.concat(fileResult.skipped);
        } catch (error) {
            return errorResponse(res, `File parsing error: ${error.message}`, 'FILE_PARSE_ERROR', 400);
        }
    }

    if (allImeis.length === 0) {
        return errorResponse(res, 'No valid IMEIs provided', 'NO_VALID_IMEIS', 400);
    }

    const uniqueImeis = [...new Set(allImeis)];

    let printedCount = 0;
    const failed = [];

    for (const imei of uniqueImeis) {
        try {
            const deviceData = await getDeviceData(imei);

            if (!deviceData) {
                failed.push({ imei, reason: 'Device not found' });
                continue;
            }

            const printResult = await sendToPrintWebhook(deviceData);

            if (printResult.success) {
                printedCount++;
            } else {
                failed.push({ imei, reason: printResult.message });
            }
        } catch (error) {
            failed.push({ imei, reason: error.message });
        }
    }

    successResponse(res, {
        printed: printedCount,
        failed: failed.length,
        failedDetails: failed.length > 0 ? failed : null,
        skipped: skipped.length > 0 ? skipped : null
    });
});

/**
 * Get device data for label printing
 * @param {string} imei - IMEI number
 * @returns {Promise<Object|null>} - Device data or null
 */
async function getDeviceData(imei) {
    const query = `
    SELECT 
      d.imei,
      m.name as manufacturer,
      mo.model_name as model,
      d.storage_gb,
      d.color,
      d.grade,
      l.code as location
    FROM devices d
    LEFT JOIN manufacturers m ON m.id = d.manufacturer_id
    LEFT JOIN models mo ON mo.id = d.model_id
    LEFT JOIN locations l ON l.id = d.location_id
    WHERE d.imei = ?
    LIMIT 1
  `;

    const [results] = await db.execute(query, [imei]);

    return results.length > 0 ? results[0] : null;
}

/**
 * Send label data to print webhook
 * @param {Object} deviceData - Device data
 * @returns {Promise<Object>} - {success, message}
 */
async function sendToPrintWebhook(deviceData) {
    const webhookUrl = process.env.PRINT_WEBHOOK_URL;
    const apiKey = process.env.PRINT_API_KEY;

    if (!webhookUrl) {
        return {
            success: false,
            message: 'Print webhook URL not configured'
        };
    }

    try {
        // Format label data for webhook
        const labelData = {
            imei: deviceData.imei,
            manufacturer: deviceData.manufacturer || '',
            model: deviceData.model || '',
            storage: deviceData.storage_gb ? `${deviceData.storage_gb}GB` : '',
            color: deviceData.color || '',
            grade: deviceData.grade || '',
            location: deviceData.location || ''
        };

        const response = await axios.post(webhookUrl, labelData, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey || ''
            },
            timeout: 10000
        });

        if (response.status >= 200 && response.status < 300) {
            return {
                success: true,
                message: 'Label sent to printer'
            };
        } else {
            return {
                success: false,
                message: `Webhook responded with status ${response.status}`
            };
        }
    } catch (error) {
        return {
            success: false,
            message: error.message || 'Failed to send to print webhook'
        };
    }
}
