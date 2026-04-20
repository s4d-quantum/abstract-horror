-- Quantum poller snapshot and audit queries
-- Database: s4d_england_db

-- These queries are written to run directly in the MySQL CLI.
-- Set the session variables you want before running each section.
--
-- Example:
SET @last_outbox_id = 0;
SET @legacy_purchase_id = 8713;
SET @legacy_order_id = 16189;

-- 1. Read the next outbox batch
SELECT
  id,
  event_type,
  entity_type,
  entity_id,
  payload_json,
  source_user,
  created_at,
  idempotency_key
FROM quantum_event_outbox
WHERE id > @last_outbox_id
  AND event_type IN (
    'goods_in.device_booked',
    'sales_order.device_reserved',
    'sales_order.updated',
    'stock.device_moved',
    'qc.updated',
    'qc.device_passed',
    'qc.device_failed'
  )
ORDER BY id
LIMIT 50;

-- 2. Purchase snapshot header
SELECT
  p.purchase_id,
  p.user_id,
  p.date,
  p.po_ref,
  p.supplier_id,
  p.qc_required,
  p.repair_required,
  s.supplier_id AS supplier_code,
  s.name AS supplier_name,
  s.address AS address_line1,
  s.address2 AS address_line2,
  s.city,
  s.postcode,
  s.country,
  s.phone,
  s.email,
  s.vat AS vat_number
FROM tbl_purchases p
LEFT JOIN tbl_suppliers s
  ON s.supplier_id = p.supplier_id
WHERE p.purchase_id = @legacy_purchase_id
ORDER BY p.id
LIMIT 1;

-- 3. Purchase snapshot devices
SELECT
  i.purchase_id,
  i.item_imei,
  i.item_tac,
  i.item_color,
  i.item_grade,
  i.item_gb,
  i.created_at,
  i.status,
  i.in_sales_order,
  t.item_brand,
  t.item_details
FROM tbl_imei i
LEFT JOIN tbl_tac t
  ON t.item_tac = i.item_tac
WHERE i.purchase_id = @legacy_purchase_id
ORDER BY i.id;

-- 4. QC snapshot for one purchase
SELECT
  q.purchase_id,
  q.item_code,
  q.item_comments,
  q.item_cosmetic_passed,
  q.item_functional_passed,
  q.item_eu,
  q.item_flashed,
  q.user_id,
  i.item_imei,
  i.item_tac,
  i.item_color,
  i.item_grade,
  i.item_gb,
  i.status,
  t.item_brand,
  t.item_details
FROM tbl_qc_imei_products q
LEFT JOIN tbl_imei i
  ON i.item_imei = q.item_code
 AND i.purchase_id = q.purchase_id
LEFT JOIN tbl_tac t
  ON t.item_tac = i.item_tac
WHERE q.purchase_id = @legacy_purchase_id
ORDER BY q.id;

-- 5. Sales-order header and line rows
SELECT
  so.order_id,
  so.date,
  so.customer_id,
  so.supplier_id,
  so.item_brand,
  so.item_details,
  so.item_color,
  so.item_grade,
  so.item_gb,
  so.tray_id,
  so.po_ref,
  so.customer_ref,
  so.item_code,
  c.customer_id AS customer_code,
  c.name AS customer_name,
  c.address AS address_line1,
  c.address2 AS address_line2,
  c.city,
  c.postcode,
  c.country,
  c.phone,
  c.email,
  c.vat AS vat_number
FROM tbl_imei_sales_orders so
LEFT JOIN tbl_customers c
  ON c.customer_id = so.customer_id
WHERE so.order_id = @legacy_order_id
ORDER BY so.id;

-- 6. Sales-order exact reserved IMEIs from tbl_imei
-- Use only when the source is known to represent an authoritative device-level state.
SELECT
  i.in_sales_order AS legacy_order_id,
  i.item_imei,
  i.item_tac,
  i.item_color,
  i.item_grade,
  i.item_gb,
  i.purchase_id,
  t.item_brand,
  t.item_details
FROM tbl_imei i
LEFT JOIN tbl_tac t
  ON t.item_tac = i.item_tac
WHERE i.in_sales_order = @legacy_order_id
ORDER BY i.id;

-- 7. Sales-order exact reserved IMEIs from nonblank item_code rows
-- Historical warning:
-- tbl_imei_sales_orders.item_code may be a placeholder selected from matching stock,
-- not the final picked IMEI, for older Quantum data.
-- Treat this as advisory unless the row comes from newer post-fix data.
SELECT
  so.order_id,
  so.item_code AS item_imei,
  so.supplier_id,
  so.item_brand,
  so.item_details,
  so.item_color,
  so.item_grade,
  so.item_gb,
  so.tray_id
FROM tbl_imei_sales_orders so
WHERE so.order_id = @legacy_order_id
  AND so.item_code IS NOT NULL
  AND TRIM(so.item_code) <> ''
ORDER BY so.id;

-- 8. Sales-order supportability check
-- This is now an authority check, not a validity check.
-- Orders can still be synced as header/line snapshots with zero exact IMEIs.
SELECT
  (SELECT COUNT(*) FROM tbl_imei WHERE in_sales_order = @legacy_order_id) AS exact_reserved_count,
  (SELECT COUNT(*) FROM tbl_imei_sales_orders
    WHERE order_id = @legacy_order_id
      AND item_code IS NOT NULL
      AND TRIM(item_code) <> '') AS line_item_code_count,
  (SELECT COUNT(*) FROM tbl_imei_sales_orders
    WHERE order_id = @legacy_order_id) AS total_line_count;

-- 9. Distinct purchase-side CATxx/details pairs
SELECT
  t.item_brand,
  t.item_details,
  COUNT(*) AS usage_count
FROM tbl_imei i
JOIN tbl_tac t
  ON t.item_tac = i.item_tac
GROUP BY t.item_brand, t.item_details
ORDER BY usage_count DESC, t.item_brand, t.item_details;

-- 10. Distinct sales-side CATxx/details pairs
SELECT
  so.item_brand,
  so.item_details,
  COUNT(*) AS usage_count
FROM tbl_imei_sales_orders so
GROUP BY so.item_brand, so.item_details
ORDER BY usage_count DESC, so.item_brand, so.item_details;

-- 11. Distinct scoped CATxx/details pairs for audit
SELECT
  src.item_brand,
  src.item_details,
  SUM(src.usage_count) AS usage_count
FROM (
  SELECT t.item_brand, t.item_details, COUNT(*) AS usage_count
  FROM tbl_imei i
  JOIN tbl_tac t
    ON t.item_tac = i.item_tac
  GROUP BY t.item_brand, t.item_details

  UNION ALL

  SELECT so.item_brand, so.item_details, COUNT(*) AS usage_count
  FROM tbl_imei_sales_orders so
  GROUP BY so.item_brand, so.item_details
) src
GROUP BY src.item_brand, src.item_details
ORDER BY usage_count DESC, src.item_brand, src.item_details;

-- 12. Plasma-side audit helper: exact legacy model mappings already present
-- Run this one against new_plasma_test, not Quantum.
SELECT
  legacy_item_brand,
  legacy_item_details,
  manufacturer_id,
  model_id
FROM legacy_sales_model_map
ORDER BY legacy_item_brand, legacy_item_details;

-- 13. Plasma-side audit helper: legacy brand mappings
-- Run this one against new_plasma_test, not Quantum.
SELECT
  legacy_item_brand,
  manufacturer_name
FROM legacy_brand_map
ORDER BY legacy_item_brand;

-- 14. Plasma-side audit helper: available native models
-- Run this one against new_plasma_test, not Quantum.
SELECT
  man.name AS manufacturer_name,
  man.code AS manufacturer_code,
  mo.id AS model_id,
  mo.model_number,
  mo.model_name
FROM models mo
JOIN manufacturers man
  ON man.id = mo.manufacturer_id
ORDER BY man.name, mo.model_number;
