import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import { Readable } from 'stream';

/**
 * File Parser Utilities
 * Parses CSV and XLSX files for IMEI extraction
 */

/**
 * Normalize IMEI (remove non-digits, validate length)
 * @param {string} raw - Raw IMEI string
 * @returns {string|null} - Normalized IMEI or null if invalid
 */
export function normalizeImei(raw) {
    const digits = raw.replace(/\D+/g, '');
    const length = digits.length;

    if (length < 14 || length > 17) {
        return null;
    }

    return digits;
}

/**
 * Parse CSV file for IMEIs (from column B)
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<Object>} - {imeis: [], skipped: []}
 */
export function parseCsvForImeis(buffer) {
    return new Promise((resolve, reject) => {
        const imeis = [];
        const skipped = [];
        let rowNumber = 0;

        const stream = Readable.from(buffer.toString());

        stream
            .pipe(csvParser({ headers: false }))
            .on('data', (row) => {
                rowNumber++;

                // Get column B (index 1)
                const columnB = row['1'];

                if (!columnB || columnB.trim() === '') {
                    return;
                }

                const value = columnB.trim();

                // Skip header row containing 'imei' without digits
                if (rowNumber === 1 && /imei/i.test(value) && !/\d/.test(value)) {
                    return;
                }

                const normalized = normalizeImei(value);
                if (!normalized) {
                    skipped.push(value);
                    return;
                }

                imeis.push(normalized);
            })
            .on('end', () => {
                resolve({ imeis, skipped });
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

/**
 * Parse XLSX file for IMEIs (from column B)
 * @param {Buffer} buffer - File buffer
 * @returns {Object} - {imeis: [], skipped: []}
 */
export function parseXlsxForImeis(buffer) {
    const imeis = [];
    const skipped = [];

    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Get range
        const range = XLSX.utils.decode_range(worksheet['!ref']);

        // Iterate through rows, read column B (column index 1)
        for (let row = range.s.r; row <= range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 }); // Column B
            const cell = worksheet[cellAddress];

            if (!cell || !cell.v) {
                continue;
            }

            const value = String(cell.v).trim();

            if (value === '') {
                continue;
            }

            // Skip header row containing 'imei' without digits
            if (row === range.s.r && /imei/i.test(value) && !/\d/.test(value)) {
                continue;
            }

            const normalized = normalizeImei(value);
            if (!normalized) {
                skipped.push(value);
                continue;
            }

            imeis.push(normalized);
        }

        return { imeis, skipped };
    } catch (error) {
        throw new Error(`Failed to parse XLSX file: ${error.message}`);
    }
}

/**
 * Parse IMEIs from text input (newline, comma, or space separated)
 * @param {string} text - Input text
 * @returns {Object} - {imeis: [], skipped: []}
 */
export function parseImeisFromText(text) {
    const imeis = [];
    const skipped = [];

    // Split by newlines, commas, semicolons, or spaces
    const candidates = text.split(/[\s,;]+/);

    for (const candidate of candidates) {
        const trimmed = candidate.trim();

        if (trimmed === '') {
            continue;
        }

        const normalized = normalizeImei(trimmed);
        if (!normalized) {
            skipped.push(trimmed);
            continue;
        }

        imeis.push(normalized);
    }

    return { imeis, skipped };
}
