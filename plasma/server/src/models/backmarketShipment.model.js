import db from '../config/database.js';

/**
 * BackMarket Shipment Model
 * Manages backmarket_shipments table for tracking BM order processing
 */
class BackmarketShipmentModel {
    /**
     * Create a new BackMarket shipment record
     */
    async create(data) {
        const {
            salesOrderId = null,  // Now nullable
            backmarketOrderId,
            customerName,
            addressRaw,
            addressCleaned,
            dpdConsignment,
            dpdShipmentId,  // New field
            trackingNumber,
            labelZpl,
            dispatchNoteUrl,
            shipmentBooked = false,
            backmarketUpdated = false
        } = data;

        const sql = `
      INSERT INTO backmarket_shipments (
        sales_order_id,
        backmarket_order_id,
        customer_name,
        address_raw,
        address_cleaned,
        dpd_consignment,
        dpd_shipment_id,
        tracking_number,
        label_zpl,
        dispatch_note_url,
        shipment_booked,
        backmarket_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await db.execute(sql, [
            salesOrderId,
            backmarketOrderId,
            customerName,
            addressRaw,
            addressCleaned,
            dpdConsignment,
            dpdShipmentId,
            trackingNumber,
            labelZpl,
            dispatchNoteUrl,
            shipmentBooked,
            backmarketUpdated
        ]);

        return result.insertId;
    }

    /**
     * Find shipment by sales order ID
     */
    async findBySalesOrder(salesOrderId) {
        const sql = 'SELECT * FROM backmarket_shipments WHERE sales_order_id = ?';
        const [rows] = await db.execute(sql, [salesOrderId]);
        return rows[0] || null;
    }

    /**
     * Find shipment by BackMarket order ID
     */
    async findByBMOrder(backmarketOrderId) {
        const sql = 'SELECT * FROM backmarket_shipments WHERE backmarket_order_id = ?';
        const [rows] = await db.execute(sql, [backmarketOrderId]);
        return rows[0] || null;
    }

    /**
     * Find shipment by ID
     */
    async findById(id) {
        const sql = 'SELECT * FROM backmarket_shipments WHERE id = ?';
        const [rows] = await db.execute(sql, [id]);
        return rows[0] || null;
    }

    /**
     * Update shipment record
     */
    async update(id, data) {
        const allowedFields = [
            'customer_name',
            'address_raw',
            'address_cleaned',
            'dpd_consignment',
            'dpd_shipment_id',
            'tracking_number',
            'label_zpl',
            'dispatch_note_url',
            'shipment_booked',
            'backmarket_updated'
        ];

        const updateFields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        if (updateFields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);

        const sql = `UPDATE backmarket_shipments SET ${updateFields.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(sql, values);

        return result.affectedRows > 0;
    }

    /**
     * Update shipment status flags
     */
    async updateStatus(id, shipmentBooked, backmarketUpdated) {
        const sql = `
      UPDATE backmarket_shipments 
      SET shipment_booked = ?, backmarket_updated = ?
      WHERE id = ?
    `;

        const [result] = await db.execute(sql, [shipmentBooked, backmarketUpdated, id]);
        return result.affectedRows > 0;
    }

    /**
     * Delete shipment record (for cleanup/testing)
     */
    async delete(id) {
        const sql = 'DELETE FROM backmarket_shipments WHERE id = ?';
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows > 0;
    }
}

export default new BackmarketShipmentModel();
