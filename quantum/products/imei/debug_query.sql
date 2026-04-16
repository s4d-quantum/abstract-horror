-- Check for duplicate purchase records for DVB Ltd
SELECT
    pr.item_imei,
    COUNT(*) as purchase_count,
    GROUP_CONCAT(pr.purchase_id) as purchase_ids,
    GROUP_CONCAT(pr.tray_id) as tray_ids
FROM tbl_purchases pr
WHERE pr.supplier_id = 'SUP-100'
GROUP BY pr.item_imei
HAVING COUNT(*) > 1
ORDER BY purchase_count DESC
LIMIT 20;
