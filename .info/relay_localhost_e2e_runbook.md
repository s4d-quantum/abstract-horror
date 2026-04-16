# Quantum to Plasma Relay Runbook

## Current Topology

As of 2026-04-15, the working shape is:

- Quantum app + Quantum DB on `10.118.20.2`
- Relay service + Plasma app + Plasma DB on `10.118.20.149`

This is no longer a same-machine setup, so the relay must be configured from its own env file and Quantum must post over HTTP to the relay host.

## What Changed After Re-checking the Real Data

The fresh databases are materially different from the earlier empty test copies:

- `new_quantum_test` and `new_plasma_test` contain real migrated business data
- supplier and customer business codes already match across systems
  - example: Quantum `CST-78` = Plasma `CST-78`
  - example: Quantum `SUP-220` = Plasma `SUP-220`
- the new Plasma test DB already contains populated mapping tables
  - `legacy_supplier_map`: `205` rows
  - `legacy_customer_map`: `116` rows
  - `legacy_location_map`: `193` rows
  - `legacy_purchase_order_map`: `8646` rows
  - `legacy_sales_order_map`: `16578` rows

The important translation details from the real data are:

- Quantum supplier and customer values are often business codes like `SUP-220` and `CST-78`, not raw numeric IDs
- Quantum tray values are often tray codes like `TR001`, while `legacy_location_map` stores numeric legacy tray row IDs
- Quantum manufacturer values are legacy category codes like `CAT1`, `CAT3`, `CAT6`
- Plasma manufacturers are normal inventory rows like `Apple`, `Samsung`, `Sony`

Because of that, the relay path was updated to tolerate real-world identifier shapes instead of assuming synthetic test values.

## Safety Rule

Quantum web requests do not pick their active database from the relay env.

They use the logged-in account's `$_SESSION['user_db']`.

That means:

- if you log into a Quantum account whose `user_db` is `s4d_england_db`, the web request is on the live production DB
- changing only `relay/.env` or the repo-root `.env` does not make a Quantum web session safe

The outbox helper now hard-blocks relay writes on `s4d_england_db` unless `ALLOW_PROD_RELAY_OUTBOX=true` is set deliberately.

You should leave that flag unset.

## Fixes Applied

The current code now includes these repairs:

- `relay` now reads `relay/.env` correctly; repo-root `.env` is only a fallback
- Quantum dispatcher now accepts `RELAY_INGEST_URL` and falls back to the older `RELAY_QUANTUM_BASE_URL`
- Quantum CLI DB bootstrap now honors `DB_DATABASE` when run from the shell, so the dispatcher can target the intended DB without the old session hack
- Quantum relay outbox and dispatcher now fail closed on `s4d_england_db` unless `ALLOW_PROD_RELAY_OUTBOX=true` is explicitly set
- Plasma integration model and service were repaired after a partial broken edit left them syntactically invalid
- Plasma translation now resolves:
  - supplier by legacy map first, then by supplier code
  - customer by legacy map first, then by customer code
  - location by legacy map first, then by location code
- Quantum purchase and sales emitters now include richer payload metadata:
  - `legacy_supplier_code`
  - `legacy_customer_code`
  - `supplier_name`
  - `customer_name`
  - `legacy_tray_code`
  - `manufacturer_name`
- Plasma purchase and sales translation now uses the real payload shape:
  - purchase devices resolve manufacturer and model before book-in
  - sales reservations synthesize order lines from device payloads when `payload.lines` is absent

## Migrations and Verification

The idempotent migrations were re-run against the fresh test copies:

```bash
mysql -uq2test -p715525 new_quantum_test < migrations/quantum/test/001_relay_outbox.sql
cd /home/gascat/Documents/adminop/plasma/server && DB_NAME=new_plasma_test TEST_DB_NAME=new_plasma_test node migrate-integration-module.js
cd /home/gascat/Documents/adminop
mysql -uq2test -p715525 new_plasma_test < migrations/relay/test/001_relay_meta.sql
```

Quick verification queries:

```bash
mysql -uq2test -p715525 -D new_quantum_test -e "
SHOW TABLES LIKE 'relay_outbox';
SHOW TABLES LIKE 'relay_dispatch_log';
SELECT COUNT(*) AS outbox_rows FROM relay_outbox;
SELECT COUNT(*) AS dispatch_log_rows FROM relay_dispatch_log;
"

mysql -uq2test -p715525 -D new_plasma_test -e "
SHOW TABLES LIKE 'integration_event_receipts';
SHOW TABLES LIKE 'event_receipts';
SHOW TABLES LIKE 'relay_exceptions';
SELECT COUNT(*) AS supplier_maps FROM legacy_supplier_map;
SELECT COUNT(*) AS customer_maps FROM legacy_customer_map;
SELECT COUNT(*) AS location_maps FROM legacy_location_map;
SELECT COUNT(*) AS purchase_maps FROM legacy_purchase_order_map;
SELECT COUNT(*) AS sales_maps FROM legacy_sales_order_map;
"
```

Important note:

- On the fresh migrated copies, the core mapping tables are already populated.
- Do not manually seed duplicate supplier/customer/location maps unless a genuinely new legacy code appears that is not already present.

## Env Files

## 1. Relay on `10.118.20.149`

File:

- `relay/.env`

Minimum shape:

```dotenv
RELAY_PORT=3010
RELAY_SHARED_SECRET=relay-dev-secret
RELAY_META_DB_HOST=localhost
RELAY_META_DB_PORT=3306
RELAY_META_DB_USER=q2test
RELAY_META_DB_PASSWORD=...
RELAY_META_DB_NAME=new_plasma_test
RELAY_QUANTUM_TEST_DB=new_quantum_test
RELAY_PLASMA_TEST_DB=new_plasma_test
RELAY_QUANTUM_PROD_DB=s4d_england_db
RELAY_PLASMA_PROD_DB=q2_base_db
RELAY_PLASMA_BASE_URL=http://localhost:3001
RELAY_PLASMA_SERVICE_TOKEN=relay-dev-token
```

Sanity-check that the relay is actually reading this file:

```bash
cd /home/gascat/Documents/adminop
node --input-type=module -e "import { env } from './relay/src/config/env.js'; console.log(env.RELAY_META_DB_NAME)"
```

Expected output:

- `new_plasma_test` for test
- or your chosen production meta DB if you intentionally switch later

## 2. Plasma on `10.118.20.149`

File:

- `plasma/server/.env`

For the migrated test stack:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=q2test
DB_PASSWORD=...
DB_NAME=new_plasma_test
TEST_DB_NAME=new_plasma_test
INTEGRATION_SERVICE_TOKEN=relay-dev-token
```

## 3. Quantum on `10.118.20.2`

File:

- `quantum/.env`

Minimum relay-related shape on the Quantum host:

```dotenv
DB_HOST=localhost
DB_USERNAME=quantum
DB_PASSWORD=...
DB_DATABASE=new_quantum_test

RELAY_INGEST_URL=http://10.118.20.149:3010
RELAY_SHARED_SECRET=relay-dev-secret
```

Notes:

- `RELAY_INGEST_URL` is now the preferred setting for the dispatcher
- `DB_DATABASE` is now honored for CLI runs of the dispatcher
- the relay shared secret must match the one in `relay/.env`

## Start Order

## 1. Start Plasma on `10.118.20.149`

```bash
cd /home/gascat/Documents/adminop/plasma/server
npm run dev
```

Health check:

```bash
curl http://localhost:3001/health
```

## 2. Start the Relay on `10.118.20.149`

```bash
cd /home/gascat/Documents/adminop/relay
npm run dev
```

Health check:

```bash
curl http://localhost:3010/health
```

## 3. Verify Integration Auth on Plasma

From `10.118.20.149`:

```bash
curl -H "Authorization: Bearer relay-dev-token" http://localhost:3001/api/integration/lookups/customers/78
curl -H "Authorization: Bearer relay-dev-token" http://localhost:3001/api/integration/lookups/suppliers/220
curl -H "Authorization: Bearer relay-dev-token" http://localhost:3001/api/integration/lookups/locations/25
```

These should succeed against `new_plasma_test` because the migrated maps are already present.

## Dispatcher on the Quantum Host

Run this on `10.118.20.2` after confirming `quantum/.env` is correct:

```bash
cd /path/to/quantum
composer install
php scripts/dispatch_relay_outbox.php
```

The old inline PHP session workaround should no longer be necessary for CLI runs because `quantum/db_config.php` now honors `DB_DATABASE` when `PHP_SAPI === 'cli'`.

## Real Smoke Tests

## 1. Purchase Booked In

Use Quantum normally on `10.118.20.2` and complete a real purchase through:

- `quantum/purchases/imei_purchases/includes/submit_new_purchase.php`

Recommended first test:

- supplier with a known migrated code, for example `SUP-220` or `SUP-262`
- tray with a known migrated code, for example `TR001`
- single IMEI
- user with an existing `legacy_user_map` row

After the action, on the Quantum DB:

```bash
mysql -uquantum -p -D new_quantum_test -e "
SELECT id, event_uuid, event_type, aggregate_id, status, attempt_count, last_error, created_at
FROM relay_outbox
ORDER BY id DESC
LIMIT 10;
"
```

Then run the dispatcher on the Quantum host:

```bash
php scripts/dispatch_relay_outbox.php
```

On the Plasma host, inspect relay and integration state:

```bash
mysql -uq2test -p715525 -D new_plasma_test -e "
SELECT id, event_uuid, event_type, status, last_error, created_at
FROM event_receipts
ORDER BY id DESC
LIMIT 10;

SELECT id, event_receipt_id, exception_status, reason_code, reason_message, created_at
FROM relay_exceptions
ORDER BY id DESC
LIMIT 10;

SELECT id, source_event_id, event_type, status, error_code, last_error, processed_at
FROM integration_event_receipts
ORDER BY id DESC
LIMIT 10;
"
```

Expected success path:

- Quantum `relay_outbox.status = SENT`
- Relay `event_receipts.status = APPLIED`
- Plasma `integration_event_receipts.status = APPLIED`
- a row exists in `legacy_purchase_order_map` for the new legacy purchase ID

## 2. Sales Reserved

Use Quantum normally on `10.118.20.2` and complete a reservation through:

- `quantum/sales/imei_orders/includes/submit_order.php`

Recommended first test:

- customer with a known migrated code, for example `CST-78` or `CST-109`
- IMEI that already exists in Plasma
- same mapped user as above

Check Quantum outbox:

```bash
mysql -uquantum -p -D new_quantum_test -e "
SELECT id, event_uuid, event_type, aggregate_id, status, attempt_count, last_error, created_at
FROM relay_outbox
WHERE event_type = 'SALES_RESERVED'
ORDER BY id DESC
LIMIT 10;
"
```

Dispatch:

```bash
php scripts/dispatch_relay_outbox.php
```

Then inspect:

- `new_plasma_test.event_receipts`
- `new_plasma_test.relay_exceptions`
- `new_plasma_test.integration_event_receipts`
- `new_plasma_test.legacy_sales_order_map`
- `new_plasma_test.legacy_device_reserved_sales_order_map`

## Useful Queries Against the Real Data

Quantum examples:

```bash
mysql -uquantum -p -D new_quantum_test -e "
SELECT id, customer_id, name FROM tbl_customers WHERE customer_id IN ('CST-78', 'CST-109');
SELECT id, supplier_id, name FROM tbl_suppliers WHERE supplier_id IN ('SUP-220', 'SUP-262');
SELECT id, tray_id, title FROM tbl_trays WHERE tray_id IN ('TR001', 'TR019', 'TR006');
SELECT category_id, title FROM tbl_categories WHERE category_id IN ('CAT1', 'CAT3', 'CAT6');
"
```

Plasma examples:

```bash
mysql -uq2test -p715525 -D new_plasma_test -e "
SELECT id, customer_code, name, is_backmarket FROM customers WHERE customer_code IN ('CST-78', 'CST-109');
SELECT id, supplier_code, name FROM suppliers WHERE supplier_code IN ('SUP-220', 'SUP-262');
SELECT id, code, name, location_type FROM locations WHERE code IN ('TR001', 'TR019', 'TR006');
SELECT id, name, code FROM manufacturers WHERE name IN ('Apple', 'Samsung', 'Sony');
"
```

## Common Failure Modes

## Relay still appears to use the wrong DB

Check:

```bash
node --input-type=module -e "import { env } from './relay/src/config/env.js'; console.log(env)"
```

If the values still look wrong:

- verify you are editing `relay/.env`, not only the repo-root `.env`
- restart the relay process after env edits

## Quantum dispatcher posts to the wrong host

Check on `10.118.20.2`:

- `RELAY_INGEST_URL` points to `http://10.118.20.149:3010`
- the relay host is reachable from the Quantum host

Quick check:

```bash
curl http://10.118.20.149:3010/health
```

## Supplier or customer lookup fails even though the code exists

Check whether the event payload is carrying the code you expect in `relay_outbox.payload_json`. The current emitters now include:

- `legacy_supplier_code`
- `legacy_customer_code`
- `manufacturer_name`

Older outbox rows created before this fix may still be missing those fields.

## Location resolution fails

The common cause is a tray code being sent where an older integration path expected a numeric legacy tray row ID.

The current service now supports both:

- numeric legacy tray IDs through `legacy_location_map`
- tray codes like `TR001` through direct location code lookup

## Manufacturer or model resolution fails

The common cause is legacy Quantum category codes like `CAT1` without the translated manufacturer name.

The current emitters now include `manufacturer_name`, but older outbox rows may still only contain `CAT*` codes.

If needed, inspect the event body:

```bash
mysql -uquantum -p -D new_quantum_test -e "
SELECT id, event_type, payload_json
FROM relay_outbox
ORDER BY id DESC
LIMIT 5;
"
```

## Recommended Next Validation

Once the purchase and sales smoke tests are confirmed clean:

- test `GOODS_OUT_COMPLETED`
- test `ADMIN_LOCATION_MOVED`
- test one `LEVEL3_BOOKED` path
- prove replay of one failed event after correcting the root cause

That will give a much better signal than the old empty-fixture test DB ever could.
