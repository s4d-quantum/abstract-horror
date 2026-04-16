import backmarketService from '../services/backmarket.service.js';
import idealPostcodesService from '../services/idealPostcodes.service.js';
import dpdService from '../services/dpd.service.js';
import BackmarketShipment from '../models/backmarketShipment.model.js';
import { salesOrderModel } from '../models/salesOrderModel.js';
import { logBackmarketActivity } from '../utils/backmarket.utils.js';
import { transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/validation.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import axios from 'axios';

/**
 * Complete automated BackMarket shipment booking workflow
 * Triggered from sales order detail page "Book Shipment" button
 */
export const bookBackmarketShipment = asyncHandler(async (req, res) => {
    const { salesOrderId } = req.params;
    const userId = req.user.id;

    console.log(`[BackMarket] Starting shipment booking for sales order ${salesOrderId}`);

    // Step 1: Get sales order details
    const salesOrder = await salesOrderModel.getById(salesOrderId);

    if (!salesOrder) {
        return errorResponse(res, 'Sales order not found', 'SALES_ORDER_NOT_FOUND', 404);
    }

    if (!salesOrder.backmarket_order_id) {
        return errorResponse(
            res,
            'Sales order does not have a BackMarket order ID',
            'MISSING_BACKMARKET_ORDER_ID',
            400
        );
    }

    const bmOrderId = salesOrder.backmarket_order_id;

        // Step 2: Fetch BackMarket order details
        console.log(`[BackMarket] Fetching BM order ${bmOrderId}`);
        const bmOrder = await backmarketService.fetchOrderDetails(bmOrderId);

        await logBackmarketActivity('BACKMARKET_ORDER_FETCHED', bmOrderId, userId, {
            salesOrderId,
            customer: bmOrder.customer,
            price: bmOrder.price
        });

        // Step 3: Clean and validate address
        console.log(`[BackMarket] Validating address for BM order ${bmOrderId}`);
        const addressValidation = await idealPostcodesService.validateAddress(bmOrder.shipping_address);

        const cleanedAddress = addressValidation.cleaned;

        // Step 4: Get picked devices to extract IMEI
    const pickedDevices = await salesOrderModel.getPickedDevices(salesOrderId);

    if (pickedDevices.length === 0) {
        return errorResponse(
            res,
            'No devices have been picked for this order. Please pick devices first.',
            'NO_PICKED_DEVICES',
            400
        );
    }

    const deviceImei = pickedDevices[0].imei; // Get first device IMEI

        // Step 5: Book DPD shipment
        console.log(`[BackMarket] Booking DPD shipment for BM order ${bmOrderId}`);

        const geoSession = await dpdService.loginGeoSession();

        const shipmentData = await dpdService.bookShipment(
            geoSession,
            cleanedAddress,
            {
                first_name: bmOrder.customer.first_name,
                last_name: bmOrder.customer.last_name,
                phone: bmOrder.customer.phone,
                email: bmOrder.customer.email
            },
            bmOrder.price,
            `BM-${bmOrderId}`
        );

        console.log(`[BackMarket] DPD shipment booked: ${shipmentData.consignmentNumber}`);

        // Step 6: Retrieve label from MyShipments
        const cookies = await dpdService.loginMyShipments();
        const uuid = await dpdService.findShipmentUUID(cookies, shipmentData.consignmentNumber);
        const zplData = await dpdService.retrieveLabel(cookies, uuid, shipmentData.parcelNumber);

        // Step 7: Send label to print webhook
        await dpdService.sendLabelToPrinter(zplData);
        console.log(`[BackMarket] Label sent to printer`);

        await logBackmarketActivity('DPD_SHIPMENT_BOOKED', bmOrderId, userId, {
            salesOrderId,
            consignmentNumber: shipmentData.consignmentNumber,
            parcelNumber: shipmentData.parcelNumber,
            uuid
        });

        // Step 8: Update BackMarket with tracking and IMEI
        console.log(`[BackMarket] Updating BM order ${bmOrderId} with tracking`);

        await backmarketService.updateShippingInfo(
            bmOrderId,
            deviceImei,
            shipmentData.parcelNumber,
            'DPD UK'
        );

        // Step 9: Download and print delivery note
        console.log(`[BackMarket] Downloading delivery note for BM order ${bmOrderId}`);

        // Fetch order again to get delivery_note URL
        const updatedBmOrder = await backmarketService.fetchOrderDetails(bmOrderId);

        if (updatedBmOrder.delivery_note) {
            const deliveryNotePdf = await backmarketService.downloadDeliveryNote(updatedBmOrder.delivery_note);

            // Send to laser print webhook
            const laserWebhookUrl = process.env.LASER_WEBHOOK_URL;
            const laserApiKey = process.env.LASER_API_KEY;

            await axios.post(laserWebhookUrl, deliveryNotePdf, {
                headers: {
                    'X-API-Key': laserApiKey,
                    'Content-Type': 'application/pdf'
                }
            });

            console.log(`[BackMarket] Delivery note sent to printer`);
        }

        await logBackmarketActivity('BACKMARKET_ORDER_UPDATED', bmOrderId, userId, {
            salesOrderId,
            imei: deviceImei,
            trackingNumber: shipmentData.parcelNumber
        });

        // Step 10-12: Update database atomically with transaction
        // All external API calls are complete; now persist to database
        await transaction(async (connection) => {
            // Step 10: Update sales order with tracking info and mark as shipped
            await connection.query(`
                UPDATE sales_orders
                SET
                    status = 'SHIPPED',
                    shipped_at = NOW(),
                    courier = ?,
                    tracking_number = ?
                WHERE id = ?
            `, ['DPD UK', shipmentData.parcelNumber, salesOrderId]);

            // Mark all items as shipped
            await connection.query(`
                UPDATE sales_order_items
                SET shipped = 1, shipped_at = NOW()
                WHERE sales_order_id = ?
            `, [salesOrderId]);

            // Update device status to SHIPPED
            await connection.query(`
                UPDATE devices d
                JOIN sales_order_items soi ON d.id = soi.device_id
                SET d.status = 'SHIPPED'
                WHERE soi.sales_order_id = ?
            `, [salesOrderId]);

            // Step 11: Store shipment data in backmarket_shipments table
            const [existingShipments] = await connection.query(
                'SELECT id FROM backmarket_shipments WHERE backmarket_order_id = ?',
                [bmOrderId]
            );

            if (existingShipments.length > 0) {
                await connection.query(`
                    UPDATE backmarket_shipments
                    SET
                        dpd_consignment = ?,
                        dpd_shipment_id = ?,
                        tracking_number = ?,
                        label_zpl = ?,
                        dispatch_note_url = ?,
                        shipment_booked = TRUE,
                        backmarket_updated = TRUE,
                        updated_at = NOW()
                    WHERE id = ?
                `, [
                    shipmentData.consignmentNumber,
                    uuid,
                    shipmentData.parcelNumber,
                    zplData,
                    updatedBmOrder.delivery_note,
                    existingShipments[0].id
                ]);
            } else {
                await connection.query(`
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
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
                `, [
                    salesOrderId,
                    bmOrderId,
                    `${bmOrder.customer.first_name} ${bmOrder.customer.last_name}`,
                    JSON.stringify(bmOrder.shipping_address),
                    JSON.stringify(cleanedAddress),
                    shipmentData.consignmentNumber,
                    uuid,
                    shipmentData.parcelNumber,
                    zplData,
                    updatedBmOrder.delivery_note
                ]);
            }
        });

    console.log(`[BackMarket] Shipment booking complete for BM order ${bmOrderId}`);

    return successResponse(res, {
        data: {
            backmarketOrderId: bmOrderId,
            consignmentNumber: shipmentData.consignmentNumber,
            trackingNumber: shipmentData.parcelNumber,
            imei: deviceImei,
            salesOrderStatus: 'SHIPPED'
        }
    }, 'BackMarket shipment booked successfully');
});
