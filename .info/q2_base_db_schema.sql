-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: q2_base_db
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_log`
--

DROP TABLE IF EXISTS `activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `log_date` date NOT NULL,
  `log_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int unsigned DEFAULT NULL,
  `imei` varchar(20) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `user_id` int unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`,`log_date`),
  KEY `idx_date` (`log_date`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_imei` (`imei`),
  KEY `idx_user` (`user_id`),
  KEY `idx_time` (`log_time`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
/*!50100 PARTITION BY RANGE (to_days(`log_date`))
(PARTITION p_2024_q1 VALUES LESS THAN (739342) ENGINE = InnoDB,
 PARTITION p_2024_q2 VALUES LESS THAN (739433) ENGINE = InnoDB,
 PARTITION p_2024_q3 VALUES LESS THAN (739525) ENGINE = InnoDB,
 PARTITION p_2024_q4 VALUES LESS THAN (739617) ENGINE = InnoDB,
 PARTITION p_2025_q1 VALUES LESS THAN (739707) ENGINE = InnoDB,
 PARTITION p_2025_q2 VALUES LESS THAN (739798) ENGINE = InnoDB,
 PARTITION p_2025_q3 VALUES LESS THAN (739890) ENGINE = InnoDB,
 PARTITION p_2025_q4 VALUES LESS THAN (739982) ENGINE = InnoDB,
 PARTITION p_future VALUES LESS THAN MAXVALUE ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_operations`
--

DROP TABLE IF EXISTS `admin_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_operations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `operation_type` enum('BULK_LOCATION_MOVE','COLOR_CHECK','MANUAL_STATUS_CHANGE','DATA_CORRECTION','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `affected_count` int unsigned DEFAULT '0',
  `affected_imeis` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `performed_by` int unsigned NOT NULL,
  `performed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`operation_type`),
  KEY `idx_user` (`performed_by`),
  KEY `idx_performed` (`performed_at`),
  CONSTRAINT `admin_operations_ibfk_1` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `admin_operations_chk_1` CHECK (json_valid(`affected_imeis`))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Log of protected admin operations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `backmarket_shipments`
--

DROP TABLE IF EXISTS `backmarket_shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `backmarket_shipments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sales_order_id` int unsigned DEFAULT NULL,
  `backmarket_order_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `customer_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_raw` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `address_cleaned` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `dpd_consignment` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dpd_shipment_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tracking_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `label_zpl` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `dispatch_note_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `shipment_booked` tinyint(1) DEFAULT '0',
  `backmarket_updated` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_so` (`sales_order_id`),
  KEY `idx_bm_order` (`backmarket_order_id`),
  KEY `idx_dpd_shipment` (`dpd_shipment_id`),
  CONSTRAINT `backmarket_shipments_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='BackMarket shipment processing and DPD booking data';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blackbelt_logs`
--

DROP TABLE IF EXISTS `blackbelt_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blackbelt_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `imei` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `serial_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `test_date` timestamp NOT NULL,
  `test_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `overall_result` enum('PASS','FAIL','INCOMPLETE') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `test_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `manufacturer` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `os_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `raw_log` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `processed` tinyint(1) DEFAULT '0',
  `linked_device_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_imei` (`imei`),
  KEY `idx_test_date` (`test_date`),
  KEY `idx_result` (`overall_result`),
  KEY `idx_processed` (`processed`),
  CONSTRAINT `blackbelt_logs_chk_1` CHECK (json_valid(`test_details`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Ingested logs from Blackbelt QC application';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `color_check_cache`
--

DROP TABLE IF EXISTS `color_check_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `color_check_cache` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `imei` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `manufacturer` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `raw_response` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `source` enum('IMEI24','LOCAL','MANUAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'IMEI24',
  `lookup_cost` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_imei` (`imei`),
  KEY `idx_imei` (`imei`),
  CONSTRAINT `color_check_cache_chk_1` CHECK (json_valid(`raw_response`))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Cache for IMEI24 color/spec lookups';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `address_line1` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_line2` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `postcode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'United Kingdom',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vat_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_backmarket` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_code` (`customer_code`),
  KEY `idx_code` (`customer_code`),
  KEY `idx_name` (`name`),
  KEY `idx_backmarket` (`is_backmarket`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Customer accounts including B2B and Backmarket consumer';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `device_history`
--

DROP TABLE IF EXISTS `device_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `device_id` int unsigned NOT NULL,
  `imei` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `event_type` enum('RECEIVED','STATUS_CHANGE','LOCATION_CHANGE','QC_COMPLETE','REPAIR_COMPLETE','SHIPPED','RETURNED','GRADE_CHANGE','PROPERTY_UPDATE','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `field_changed` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `old_value` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `new_value` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `user_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_device` (`device_id`),
  KEY `idx_imei` (`imei`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_created` (`created_at`),
  KEY `idx_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `device_history_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `device_history_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Audit trail for all device changes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `device_migration_exceptions`
--

DROP TABLE IF EXISTS `device_migration_exceptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_migration_exceptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legacy_tbl_imei_id` int DEFAULT NULL,
  `legacy_purchase_id` int DEFAULT NULL,
  `old_item_imei` varchar(255) DEFAULT NULL,
  `old_item_tac` varchar(255) DEFAULT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `old_item_color` varchar(255) DEFAULT NULL,
  `old_oem_color` varchar(255) DEFAULT NULL,
  `old_item_gb` varchar(255) DEFAULT NULL,
  `old_item_grade` varchar(50) DEFAULT NULL,
  `old_in_sales_order` varchar(50) DEFAULT NULL,
  `old_tbl_purchases_id` int DEFAULT NULL,
  `old_supplier_code` varchar(255) DEFAULT NULL,
  `old_tray_id` varchar(255) DEFAULT NULL,
  `old_qc_required` varchar(50) DEFAULT NULL,
  `old_qc_completed` varchar(50) DEFAULT NULL,
  `old_repair_required` varchar(50) DEFAULT NULL,
  `old_repair_completed` varchar(50) DEFAULT NULL,
  `old_purchase_date` varchar(50) DEFAULT NULL,
  `derived_imei` varchar(20) DEFAULT NULL,
  `derived_tac` varchar(8) DEFAULT NULL,
  `issue_type` varchar(100) NOT NULL,
  `issue_detail` text,
  `confidence_level` enum('LOW','MEDIUM','HIGH') DEFAULT 'LOW',
  `reviewed` tinyint(1) DEFAULT '0',
  `reviewed_by` int unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_legacy_imei_id` (`legacy_tbl_imei_id`),
  KEY `idx_issue_type` (`issue_type`),
  KEY `idx_reviewed` (`reviewed`)
) ENGINE=InnoDB AUTO_INCREMENT=2048 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `imei` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tac_code` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `oem_color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `grade` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('IN_STOCK','OUT_OF_STOCK','AWAITING_QC','IN_QC','AWAITING_REPAIR','IN_REPAIR','IN_LEVEL3','SHIPPED','RETURNED','SCRAPPED') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'AWAITING_QC',
  `reserved_for_so_id` int unsigned DEFAULT NULL,
  `location_id` int unsigned DEFAULT NULL,
  `purchase_order_id` int unsigned DEFAULT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `qc_required` tinyint(1) DEFAULT '1',
  `qc_completed` tinyint(1) DEFAULT '0',
  `qc_completed_at` timestamp NULL DEFAULT NULL,
  `repair_required` tinyint(1) DEFAULT '0',
  `repair_completed` tinyint(1) DEFAULT '0',
  `repair_completed_at` timestamp NULL DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cosmetic_pass` tinyint(1) DEFAULT NULL COMMENT 'Cosmetic inspection result (pass/fail)',
  `functional_pass` tinyint(1) DEFAULT NULL COMMENT 'Functional test result (pass/fail)',
  `qc_comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'QC staff comments and notes',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_imei_instock` (`imei`,`status`),
  KEY `idx_imei` (`imei`),
  KEY `idx_tac` (`tac_code`),
  KEY `idx_status` (`status`),
  KEY `idx_manufacturer` (`manufacturer_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_grade` (`grade`),
  KEY `idx_purchase_order` (`purchase_order_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_instock_manufacturer` (`status`,`manufacturer_id`),
  KEY `idx_instock_model` (`status`,`model_id`),
  KEY `idx_awaiting_qc` (`status`,`qc_required`,`qc_completed`),
  KEY `idx_awaiting_repair` (`status`,`repair_required`,`repair_completed`),
  KEY `idx_reserved_for_so` (`reserved_for_so_id`),
  KEY `idx_qc_required` (`qc_required`,`qc_completed`) COMMENT 'Index for filtering QC jobs',
  KEY `idx_purchase_order_qc` (`purchase_order_id`,`qc_required`) COMMENT 'Index for grouping QC jobs by PO',
  CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`),
  CONSTRAINT `devices_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`),
  CONSTRAINT `devices_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `devices_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `fk_devices_reserved_so` FOREIGN KEY (`reserved_for_so_id`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=386549 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Main device inventory - one row per device instance';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `grade_definitions`
--

DROP TABLE IF EXISTS `grade_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grade_definitions` (
  `grade` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sort_order` tinyint unsigned DEFAULT NULL,
  PRIMARY KEY (`grade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Grade definitions for reference/display purposes';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legacy_device_reserved_sales_order_map`
--

DROP TABLE IF EXISTS `legacy_device_reserved_sales_order_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_device_reserved_sales_order_map` (
  `device_id` int NOT NULL,
  `legacy_sales_order_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`device_id`),
  KEY `idx_legacy_so` (`legacy_sales_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legacy_purchase_order_map`
--

DROP TABLE IF EXISTS `legacy_purchase_order_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_purchase_order_map` (
  `legacy_purchase_id` int NOT NULL,
  `purchase_order_id` int unsigned NOT NULL,
  `po_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`legacy_purchase_id`),
  KEY `idx_po_id` (`purchase_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legacy_sales_brand_map`
--

DROP TABLE IF EXISTS `legacy_sales_brand_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_sales_brand_map` (
  `legacy_item_brand` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  PRIMARY KEY (`legacy_item_brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legacy_sales_model_map`
--

DROP TABLE IF EXISTS `legacy_sales_model_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_sales_model_map` (
  `legacy_item_brand` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `legacy_item_details` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`legacy_item_brand`,`legacy_item_details`),
  KEY `idx_model_id` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legacy_sales_order_map`
--

DROP TABLE IF EXISTS `legacy_sales_order_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_sales_order_map` (
  `legacy_order_id` int NOT NULL,
  `sales_order_id` int unsigned NOT NULL,
  `so_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`legacy_order_id`),
  KEY `idx_sales_order_id` (`sales_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `legacy_user_map`
--

DROP TABLE IF EXISTS `legacy_user_map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legacy_user_map` (
  `old_user_id` int NOT NULL,
  `new_user_id` int unsigned NOT NULL,
  `username` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  PRIMARY KEY (`old_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `level3_repairs`
--

DROP TABLE IF EXISTS `level3_repairs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `level3_repairs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `device_id` int unsigned NOT NULL,
  `location_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `fault_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `engineer_comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `status` enum('BOOKED_IN','IN_PROGRESS','AWAITING_PARTS','ON_HOLD','COMPLETED','BER','UNREPAIRABLE') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'BOOKED_IN',
  `booked_in_by` int unsigned NOT NULL,
  `assigned_to` int unsigned DEFAULT NULL,
  `booked_in_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booked_in_by` (`booked_in_by`),
  KEY `assigned_to` (`assigned_to`),
  KEY `idx_device` (`device_id`),
  KEY `idx_location` (`location_code`),
  KEY `idx_status` (`status`),
  CONSTRAINT `level3_repairs_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `level3_repairs_ibfk_2` FOREIGN KEY (`booked_in_by`) REFERENCES `users` (`id`),
  CONSTRAINT `level3_repairs_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Level 3 board-level repairs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `location_type` enum('TRAY','RACK','REPAIR','QC','LEVEL3','SHIPPING','RETURNS','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'TRAY',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_type` (`location_type`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stock locations - trays, racks, repair bays, etc.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `manufacturers`
--

DROP TABLE IF EXISTS `manufacturers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `manufacturers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Device manufacturers - replaces tbl_categories';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_clean_devices_staging`
--

DROP TABLE IF EXISTS `migration_clean_devices_staging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_clean_devices_staging` (
  `legacy_tbl_imei_id` int NOT NULL,
  `legacy_purchase_id` int DEFAULT NULL,
  `imei` varchar(20) NOT NULL,
  `tac_code` char(8) NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `oem_color` varchar(50) DEFAULT NULL,
  `grade` char(1) DEFAULT NULL,
  `mapped_status` enum('IN_STOCK','OUT_OF_STOCK') NOT NULL,
  `location_id` int unsigned NOT NULL,
  `supplier_id` int unsigned NOT NULL,
  `reserved_for_so_id` int unsigned DEFAULT NULL,
  `qc_required` tinyint(1) DEFAULT NULL,
  `qc_completed` tinyint(1) DEFAULT NULL,
  `repair_required` tinyint(1) DEFAULT NULL,
  `repair_completed` tinyint(1) DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `legacy_item_tac` varchar(100) DEFAULT NULL,
  `legacy_item_color` varchar(100) DEFAULT NULL,
  `legacy_item_gb` varchar(100) DEFAULT NULL,
  `legacy_item_grade` int DEFAULT NULL,
  `legacy_tbl_purchases_id` int DEFAULT NULL,
  `legacy_tray_id` varchar(100) DEFAULT NULL,
  `legacy_supplier_code` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`legacy_tbl_imei_id`),
  KEY `idx_imei` (`imei`),
  KEY `idx_tac` (`tac_code`),
  KEY `idx_purchase` (`legacy_purchase_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_location` (`location_id`),
  KEY `idx_status` (`mapped_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_devices_import_preview`
--

DROP TABLE IF EXISTS `migration_devices_import_preview`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_devices_import_preview` (
  `id` int NOT NULL,
  `imei` varchar(20) NOT NULL,
  `tac_code` char(8) NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) DEFAULT NULL,
  `oem_color` varchar(50) DEFAULT NULL,
  `grade` char(1) DEFAULT NULL,
  `status` enum('IN_STOCK','OUT_OF_STOCK') NOT NULL,
  `location_id` int unsigned NOT NULL,
  `purchase_order_id` int unsigned,
  `supplier_id` int unsigned NOT NULL,
  `legacy_reserved_for_so_id` int unsigned DEFAULT NULL,
  `qc_required` tinyint(1) DEFAULT NULL,
  `qc_completed` tinyint(1) DEFAULT NULL,
  `repair_required` tinyint(1) DEFAULT NULL,
  `repair_completed` tinyint(1) DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_missing_sales_lines_report`
--

DROP TABLE IF EXISTS `migration_missing_sales_lines_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_missing_sales_lines_report` (
  `legacy_order_id` int DEFAULT NULL,
  `sales_order_id` int unsigned NOT NULL,
  `so_number` varchar(107) DEFAULT NULL,
  `legacy_item_brand` varchar(100) DEFAULT NULL,
  `legacy_item_details` varchar(100) DEFAULT NULL,
  `legacy_item_color` varchar(100) DEFAULT NULL,
  `legacy_item_grade` varchar(10) DEFAULT NULL,
  `legacy_item_gb` varchar(10) DEFAULT NULL,
  `legacy_supplier_code` varchar(10) DEFAULT NULL,
  `legacy_tray_id` varchar(100) DEFAULT NULL,
  `legacy_row_count` bigint NOT NULL DEFAULT '0',
  `legacy_completed_count` decimal(23,0) DEFAULT NULL,
  `mapped_manufacturer_id` int unsigned,
  `mapped_model_id` int unsigned,
  `mapped_supplier_id` int unsigned DEFAULT '0',
  `mapped_location_id` int unsigned DEFAULT '0',
  `likely_reason` varchar(18) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_missing_sales_lines_review`
--

DROP TABLE IF EXISTS `migration_missing_sales_lines_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_missing_sales_lines_review` (
  `legacy_order_id` int DEFAULT NULL,
  `sales_order_id` int unsigned NOT NULL,
  `so_number` varchar(107) DEFAULT NULL,
  `legacy_item_brand` varchar(100) DEFAULT NULL,
  `legacy_item_details` varchar(100) DEFAULT NULL,
  `legacy_item_color` varchar(100) DEFAULT NULL,
  `legacy_item_grade` varchar(10) DEFAULT NULL,
  `legacy_item_gb` varchar(10) DEFAULT NULL,
  `legacy_supplier_code` varchar(10) DEFAULT NULL,
  `legacy_tray_id` varchar(100) DEFAULT NULL,
  `legacy_row_count` bigint NOT NULL DEFAULT '0',
  `legacy_completed_count` decimal(23,0) DEFAULT NULL,
  `mapped_manufacturer_id` int unsigned,
  `mapped_model_id` int unsigned,
  `mapped_supplier_id` int unsigned DEFAULT '0',
  `mapped_location_id` int unsigned DEFAULT '0',
  `likely_reason` varchar(18) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_purchase_order_lines_staging`
--

DROP TABLE IF EXISTS `migration_purchase_order_lines_staging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_purchase_order_lines_staging` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legacy_purchase_id` int NOT NULL,
  `purchase_order_id` int unsigned NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expected_quantity` int unsigned NOT NULL,
  `received_quantity` int unsigned NOT NULL,
  `storage_gb_key` int GENERATED ALWAYS AS (coalesce(`storage_gb`,-(1))) STORED,
  `color_key` varchar(50) GENERATED ALWAYS AS (coalesce(`color`,_utf8mb4'')) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pol_stage` (`purchase_order_id`,`manufacturer_id`,`model_id`,`storage_gb_key`,`color_key`),
  KEY `idx_purchase_order_id` (`purchase_order_id`),
  KEY `idx_legacy_purchase_id` (`legacy_purchase_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32768 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_purchase_orders_staging`
--

DROP TABLE IF EXISTS `migration_purchase_orders_staging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_purchase_orders_staging` (
  `legacy_purchase_id` int NOT NULL,
  `po_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `supplier_id` int unsigned NOT NULL,
  `supplier_ref` varchar(100) DEFAULT NULL,
  `status` enum('DRAFT','CONFIRMED','PARTIALLY_RECEIVED','FULLY_RECEIVED','CANCELLED') NOT NULL,
  `expected_quantity` int unsigned NOT NULL,
  `received_quantity` int unsigned NOT NULL,
  `requires_qc` tinyint(1) NOT NULL,
  `requires_repair` tinyint(1) NOT NULL,
  `notes` text,
  `created_by` int unsigned NOT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `legacy_user_id` int DEFAULT NULL,
  `legacy_supplier_code` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`legacy_purchase_id`),
  UNIQUE KEY `po_number` (`po_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_sales_order_lines_staging`
--

DROP TABLE IF EXISTS `migration_sales_order_lines_staging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_sales_order_lines_staging` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `legacy_order_id` int NOT NULL,
  `sales_order_id` int unsigned NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `grade` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `location_id` int unsigned DEFAULT NULL,
  `requested_quantity` int unsigned NOT NULL,
  `picked_quantity` int unsigned NOT NULL,
  `storage_gb_key` int GENERATED ALWAYS AS (coalesce(`storage_gb`,-(1))) STORED,
  `color_key` varchar(50) GENERATED ALWAYS AS (coalesce(`color`,_utf8mb4'')) STORED,
  `grade_key` varchar(1) GENERATED ALWAYS AS (coalesce(`grade`,_utf8mb4'')) STORED,
  `supplier_id_key` int GENERATED ALWAYS AS (coalesce(`supplier_id`,-(1))) STORED,
  `location_id_key` int GENERATED ALWAYS AS (coalesce(`location_id`,-(1))) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_so_line_stage` (`sales_order_id`,`manufacturer_id`,`model_id`,`storage_gb_key`,`color_key`,`grade_key`,`supplier_id_key`,`location_id_key`)
) ENGINE=InnoDB AUTO_INCREMENT=65536 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migration_sales_orders_staging`
--

DROP TABLE IF EXISTS `migration_sales_orders_staging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migration_sales_orders_staging` (
  `legacy_order_id` int NOT NULL,
  `so_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` int unsigned NOT NULL,
  `order_type` enum('B2B','BACKMARKET') NOT NULL,
  `backmarket_order_id` varchar(50) DEFAULT NULL,
  `customer_ref` varchar(100) DEFAULT NULL,
  `po_ref` varchar(100) DEFAULT NULL,
  `status` enum('DRAFT','CONFIRMED','PROCESSING','PARTIALLY_SHIPPED','SHIPPED','DELIVERED','CANCELLED') NOT NULL,
  `courier` varchar(50) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `total_boxes` smallint unsigned NOT NULL DEFAULT '0',
  `total_pallets` smallint unsigned NOT NULL DEFAULT '0',
  `notes` text,
  `created_by` int unsigned NOT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `legacy_customer_code` varchar(20) DEFAULT NULL,
  `legacy_user_id` int DEFAULT NULL,
  PRIMARY KEY (`legacy_order_id`),
  UNIQUE KEY `so_number` (`so_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `models`
--

DROP TABLE IF EXISTS `models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `models` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `manufacturer_id` int unsigned NOT NULL,
  `model_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `model_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_manufacturer_model` (`manufacturer_id`,`model_number`),
  KEY `idx_model_number` (`model_number`),
  KEY `idx_model_name` (`model_name`),
  CONSTRAINT `models_ibfk_1` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2224 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Device models with both model number and friendly name';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `part_bases`
--

DROP TABLE IF EXISTS `part_bases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_bases` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `base_code` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `category_id` int unsigned NOT NULL,
  `manufacturer_id` int unsigned DEFAULT NULL,
  `subtype` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `changes_device_color` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_part_base_code` (`base_code`),
  KEY `idx_part_bases_category` (`category_id`),
  KEY `idx_part_bases_manufacturer` (`manufacturer_id`),
  CONSTRAINT `fk_part_bases_category` FOREIGN KEY (`category_id`) REFERENCES `part_categories` (`id`),
  CONSTRAINT `fk_part_bases_manufacturer` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `part_categories`
--

DROP TABLE IF EXISTS `part_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Part type categories';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `part_compatibility`
--

DROP TABLE IF EXISTS `part_compatibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_compatibility` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `part_base_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned NOT NULL DEFAULT '0',
  `notes` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_part_base_model_storage` (`part_base_id`,`model_id`,`storage_gb`),
  KEY `idx_model` (`model_id`),
  CONSTRAINT `fk_part_compatibility_base` FOREIGN KEY (`part_base_id`) REFERENCES `part_bases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `part_compatibility_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Defines which parts are compatible with which device models';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `part_fault_reports`
--

DROP TABLE IF EXISTS `part_fault_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_fault_reports` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `part_id` int unsigned NOT NULL,
  `part_lot_id` int unsigned DEFAULT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `repair_record_id` int unsigned DEFAULT NULL,
  `quantity` int unsigned NOT NULL DEFAULT '1',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('OPEN','RMA_REQUESTED','RETURNED','CREDIT_RECEIVED','WRITTEN_OFF') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'OPEN',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int unsigned DEFAULT NULL,
  `updated_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_part_fault_reports_lot` (`part_lot_id`),
  KEY `fk_part_fault_reports_record` (`repair_record_id`),
  KEY `fk_part_fault_reports_created_by` (`created_by`),
  KEY `fk_part_fault_reports_updated_by` (`updated_by`),
  KEY `idx_part_fault_reports_status` (`status`),
  KEY `idx_part_fault_reports_supplier` (`supplier_id`),
  KEY `idx_part_fault_reports_part` (`part_id`),
  CONSTRAINT `fk_part_fault_reports_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_fault_reports_lot` FOREIGN KEY (`part_lot_id`) REFERENCES `part_lots` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_fault_reports_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_part_fault_reports_record` FOREIGN KEY (`repair_record_id`) REFERENCES `repair_records` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_fault_reports_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_fault_reports_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `part_lots`
--

DROP TABLE IF EXISTS `part_lots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_lots` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `part_id` int unsigned NOT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `supplier_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lot_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `received_quantity` int unsigned NOT NULL DEFAULT '0',
  `available_quantity` int unsigned NOT NULL DEFAULT '0',
  `reserved_quantity` int unsigned NOT NULL DEFAULT '0',
  `consumed_quantity` int unsigned NOT NULL DEFAULT '0',
  `faulty_quantity` int unsigned NOT NULL DEFAULT '0',
  `issued_quantity` int unsigned NOT NULL DEFAULT '0',
  `received_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_part_lots_user` (`created_by`),
  KEY `idx_part_lots_part` (`part_id`),
  KEY `idx_part_lots_supplier` (`supplier_id`),
  KEY `idx_part_lots_available` (`available_quantity`),
  CONSTRAINT `fk_part_lots_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_part_lots_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_lots_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_lot_available_qty` CHECK ((`available_quantity` >= 0)),
  CONSTRAINT `chk_lot_consumed_qty` CHECK ((`consumed_quantity` >= 0)),
  CONSTRAINT `chk_lot_faulty_qty` CHECK ((`faulty_quantity` >= 0)),
  CONSTRAINT `chk_lot_issued_qty` CHECK ((`issued_quantity` >= 0)),
  CONSTRAINT `chk_lot_reserved_qty` CHECK ((`reserved_quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `part_transactions`
--

DROP TABLE IF EXISTS `part_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `part_id` int unsigned NOT NULL,
  `part_lot_id` int unsigned DEFAULT NULL,
  `movement_type` enum('GOODS_IN','RESERVE','UNRESERVE','FIT_RESERVED','FIT_DIRECT','REMOVE_RESTOCK','REMOVE_FAULTY','MANUAL_GOODS_OUT','FAULTY_GOODS_OUT','ADJUSTMENT') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int unsigned NOT NULL,
  `available_delta` int NOT NULL DEFAULT '0',
  `reserved_delta` int NOT NULL DEFAULT '0',
  `consumed_delta` int NOT NULL DEFAULT '0',
  `faulty_delta` int NOT NULL DEFAULT '0',
  `issued_delta` int NOT NULL DEFAULT '0',
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int unsigned DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `user_id` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_part_transactions_user` (`user_id`),
  KEY `idx_part_transactions_part` (`part_id`),
  KEY `idx_part_transactions_lot` (`part_lot_id`),
  KEY `idx_part_transactions_created` (`created_at`),
  CONSTRAINT `fk_part_transactions_lot` FOREIGN KEY (`part_lot_id`) REFERENCES `part_lots` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_part_transactions_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_part_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parts`
--

DROP TABLE IF EXISTS `parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `part_base_id` int unsigned DEFAULT NULL,
  `sku` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quality_tier` enum('OEM','OEM_PULL','PREMIUM','AFTERMARKET','REFURBISHED','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'OTHER',
  `supplier_part_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category_id` int unsigned NOT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `current_stock` int DEFAULT '0',
  `available_stock` int NOT NULL DEFAULT '0',
  `reserved_stock` int NOT NULL DEFAULT '0',
  `consumed_stock` int NOT NULL DEFAULT '0',
  `faulty_stock` int NOT NULL DEFAULT '0',
  `issued_stock` int NOT NULL DEFAULT '0',
  `min_stock_level` int DEFAULT '0',
  `cost_price` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_sku` (`sku`),
  KEY `idx_name` (`name`),
  KEY `idx_category` (`category_id`),
  KEY `idx_parts_base` (`part_base_id`),
  CONSTRAINT `fk_parts_base` FOREIGN KEY (`part_base_id`) REFERENCES `part_bases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `parts_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `part_categories` (`id`),
  CONSTRAINT `chk_part_available_stock` CHECK ((`available_stock` >= 0)),
  CONSTRAINT `chk_part_consumed_stock` CHECK ((`consumed_stock` >= 0)),
  CONSTRAINT `chk_part_current_stock` CHECK ((`current_stock` >= 0)),
  CONSTRAINT `chk_part_faulty_stock` CHECK ((`faulty_stock` >= 0)),
  CONSTRAINT `chk_part_issued_stock` CHECK ((`issued_stock` >= 0)),
  CONSTRAINT `chk_part_reserved_stock` CHECK ((`reserved_stock` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Parts inventory master';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_order_lines`
--

DROP TABLE IF EXISTS `purchase_order_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_lines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `purchase_order_id` int unsigned NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expected_quantity` int unsigned NOT NULL DEFAULT '1',
  `received_quantity` int unsigned DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `manufacturer_id` (`manufacturer_id`),
  KEY `idx_po` (`purchase_order_id`),
  KEY `idx_model` (`model_id`),
  CONSTRAINT `purchase_order_lines_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_lines_ibfk_2` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`),
  CONSTRAINT `purchase_order_lines_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32768 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Purchase order line items - expected devices';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `po_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `supplier_id` int unsigned NOT NULL,
  `supplier_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('DRAFT','CONFIRMED','PARTIALLY_RECEIVED','FULLY_RECEIVED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'DRAFT',
  `expected_quantity` int unsigned DEFAULT '0',
  `received_quantity` int unsigned DEFAULT '0',
  `requires_qc` tinyint(1) DEFAULT '1' COMMENT 'Does stock on this PO require QC?',
  `requires_repair` tinyint(1) DEFAULT '0' COMMENT 'Does stock on this PO require repair?',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int unsigned NOT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `created_by` (`created_by`),
  KEY `idx_po_number` (`po_number`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16384 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Purchase order headers';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_jobs`
--

DROP TABLE IF EXISTS `qc_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_jobs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `purchase_order_id` int unsigned NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'PENDING',
  `total_devices` int unsigned DEFAULT '0',
  `completed_devices` int unsigned DEFAULT '0',
  `passed_devices` int unsigned DEFAULT '0',
  `failed_devices` int unsigned DEFAULT '0',
  `assigned_to` int unsigned DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL COMMENT 'User who created the job',
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_number` (`job_number`),
  KEY `assigned_to` (`assigned_to`),
  KEY `idx_job_number` (`job_number`),
  KEY `idx_po` (`purchase_order_id`),
  KEY `idx_status` (`status`),
  KEY `fk_qc_jobs_created_by` (`created_by`),
  CONSTRAINT `fk_qc_jobs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `qc_jobs_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `qc_jobs_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8192 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='QC job headers grouped by purchase order';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_legacy_import_audit`
--

DROP TABLE IF EXISTS `qc_legacy_import_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_legacy_import_audit` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `legacy_qc_id` int NOT NULL,
  `legacy_purchase_id` int DEFAULT NULL,
  `new_purchase_order_id` int unsigned DEFAULT NULL,
  `device_id` int unsigned NOT NULL,
  `imei` varchar(100) NOT NULL,
  `item_cosmetic_passed` int DEFAULT NULL,
  `item_functional_passed` int DEFAULT NULL,
  `item_flashed` int DEFAULT NULL,
  `item_comments` varchar(1000) DEFAULT NULL,
  `legacy_user_id` int DEFAULT NULL,
  `item_eu` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legacy_qc_id` (`legacy_qc_id`),
  KEY `idx_device` (`device_id`),
  KEY `idx_new_po` (`new_purchase_order_id`),
  KEY `idx_imei` (`imei`)
) ENGINE=InnoDB AUTO_INCREMENT=196606 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_migration_quarantine`
--

DROP TABLE IF EXISTS `qc_migration_quarantine`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_migration_quarantine` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `legacy_qc_id` int NOT NULL,
  `legacy_purchase_id` int DEFAULT NULL,
  `legacy_item_code` varchar(100) DEFAULT NULL,
  `legacy_user_id` int DEFAULT NULL,
  `legacy_item_comments` varchar(1000) DEFAULT NULL,
  `legacy_item_cosmetic_passed` int DEFAULT NULL,
  `legacy_item_functional_passed` int DEFAULT NULL,
  `legacy_item_flashed` int DEFAULT NULL,
  `legacy_item_eu` varchar(100) DEFAULT NULL,
  `quarantine_reason` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legacy_qc_id` (`legacy_qc_id`),
  KEY `idx_reason` (`quarantine_reason`),
  KEY `idx_purchase` (`legacy_purchase_id`),
  KEY `idx_item_code` (`legacy_item_code`)
) ENGINE=InnoDB AUTO_INCREMENT=256 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_results`
--

DROP TABLE IF EXISTS `qc_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_results` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `qc_job_id` int unsigned NOT NULL,
  `device_id` int unsigned NOT NULL,
  `functional_result` enum('PASS','FAIL','UNABLE','NA') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Functional test outcome: PASS/FAIL/UNABLE (could not test)/NA (not applicable)',
  `cosmetic_result` enum('PASS','FAIL','NA') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Cosmetic test outcome: PASS/FAIL/NA',
  `overall_pass` tinyint(1) DEFAULT NULL,
  `grade_assigned` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color_verified` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `blackbelt_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `blackbelt_passed` tinyint(1) DEFAULT NULL,
  `non_uk` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Device is not UK-compatible (network bands / region lock)',
  `tested_by` int unsigned DEFAULT NULL,
  `tested_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_job` (`qc_job_id`,`device_id`),
  KEY `tested_by` (`tested_by`),
  KEY `idx_job` (`qc_job_id`),
  KEY `idx_device` (`device_id`),
  KEY `idx_pass` (`overall_pass`),
  KEY `idx_functional_result` (`functional_result`),
  KEY `idx_non_uk` (`non_uk`),
  CONSTRAINT `qc_results_ibfk_1` FOREIGN KEY (`qc_job_id`) REFERENCES `qc_jobs` (`id`),
  CONSTRAINT `qc_results_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `qc_results_ibfk_3` FOREIGN KEY (`tested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=196606 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='QC test results per device';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `qc_results_backup_20260409`
--

DROP TABLE IF EXISTS `qc_results_backup_20260409`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_results_backup_20260409` (
  `id` int unsigned NOT NULL DEFAULT '0',
  `qc_job_id` int unsigned NOT NULL,
  `device_id` int unsigned NOT NULL,
  `functional_result` enum('PASS','FAIL','UNABLE','NA') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Functional test outcome: PASS/FAIL/UNABLE (could not test)/NA (not applicable)',
  `cosmetic_result` enum('PASS','FAIL','NA') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Cosmetic test outcome: PASS/FAIL/NA',
  `overall_pass` tinyint(1) DEFAULT NULL,
  `grade_assigned` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color_verified` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `blackbelt_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `blackbelt_passed` tinyint(1) DEFAULT NULL,
  `non_uk` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Device is not UK-compatible (network bands / region lock)',
  `tested_by` int unsigned DEFAULT NULL,
  `tested_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repair_comments`
--

DROP TABLE IF EXISTS `repair_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_comments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `repair_record_id` int unsigned NOT NULL,
  `comment_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_repair_comments_user` (`created_by`),
  KEY `idx_repair_comments_record` (`repair_record_id`),
  KEY `idx_repair_comments_created` (`created_at`),
  CONSTRAINT `fk_repair_comments_record` FOREIGN KEY (`repair_record_id`) REFERENCES `repair_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repair_comments_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repair_jobs`
--

DROP TABLE IF EXISTS `repair_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_jobs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `purchase_order_id` int unsigned NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'PENDING',
  `priority` enum('LOW','NORMAL','HIGH','URGENT') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'NORMAL',
  `total_devices` int unsigned DEFAULT '0',
  `completed_devices` int unsigned DEFAULT '0',
  `assigned_to` int unsigned DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `target_sales_order_id` int unsigned DEFAULT NULL,
  `created_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_number` (`job_number`),
  UNIQUE KEY `uq_repair_job_number` (`job_number`),
  KEY `assigned_to` (`assigned_to`),
  KEY `idx_job_number` (`job_number`),
  KEY `idx_po` (`purchase_order_id`),
  KEY `idx_status` (`status`),
  KEY `fk_repair_jobs_target_so` (`target_sales_order_id`),
  KEY `fk_repair_jobs_created_by` (`created_by`),
  CONSTRAINT `fk_repair_jobs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_repair_jobs_target_so` FOREIGN KEY (`target_sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `repair_jobs_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `repair_jobs_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Repair job headers grouped by purchase order';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repair_parts_used`
--

DROP TABLE IF EXISTS `repair_parts_used`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_parts_used` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `repair_record_id` int unsigned NOT NULL,
  `part_id` int unsigned NOT NULL,
  `part_lot_id` int unsigned DEFAULT NULL,
  `quantity` smallint unsigned DEFAULT '1',
  `status` enum('RESERVED','FITTED','REMOVED_RESTOCKED','REMOVED_FAULTY') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'FITTED',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `removed_at` timestamp NULL DEFAULT NULL,
  `removed_by` int unsigned DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `added_by` int unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `added_by` (`added_by`),
  KEY `idx_repair` (`repair_record_id`),
  KEY `idx_part` (`part_id`),
  CONSTRAINT `fk_repair_parts_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`),
  CONSTRAINT `repair_parts_used_ibfk_1` FOREIGN KEY (`repair_record_id`) REFERENCES `repair_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `repair_parts_used_ibfk_2` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Parts used in device repairs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `repair_records`
--

DROP TABLE IF EXISTS `repair_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repair_records` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `repair_job_id` int unsigned NOT NULL,
  `device_id` int unsigned NOT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','ESCALATED_L3','BER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'PENDING',
  `fault_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `engineer_comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `assigned_to` int unsigned DEFAULT NULL,
  `outcome` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resolution_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `repaired_by` int unsigned DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_job` (`repair_job_id`,`device_id`),
  KEY `repaired_by` (`repaired_by`),
  KEY `idx_job` (`repair_job_id`),
  KEY `idx_device` (`device_id`),
  KEY `idx_status` (`status`),
  KEY `fk_repair_records_assigned_to` (`assigned_to`),
  CONSTRAINT `fk_repair_records_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `repair_records_ibfk_1` FOREIGN KEY (`repair_job_id`) REFERENCES `repair_jobs` (`id`),
  CONSTRAINT `repair_records_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `repair_records_ibfk_3` FOREIGN KEY (`repaired_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Repair records per device';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `return_items`
--

DROP TABLE IF EXISTS `return_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `return_id` int unsigned NOT NULL,
  `device_id` int unsigned NOT NULL,
  `condition_on_return` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `inspection_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `disposition` enum('RESTOCK','REPAIR','SCRAP','PENDING') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'PENDING',
  `processed_at` timestamp NULL DEFAULT NULL,
  `processed_by` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `processed_by` (`processed_by`),
  KEY `idx_return` (`return_id`),
  KEY `idx_device` (`device_id`),
  CONSTRAINT `return_items_ibfk_1` FOREIGN KEY (`return_id`) REFERENCES `returns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `return_items_ibfk_2` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `return_items_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Individual items in a return';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `returns`
--

DROP TABLE IF EXISTS `returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `returns` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `return_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `return_type` enum('CUSTOMER_RETURN','SUPPLIER_RETURN') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `sales_order_id` int unsigned DEFAULT NULL,
  `purchase_order_id` int unsigned DEFAULT NULL,
  `customer_id` int unsigned DEFAULT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `status` enum('PENDING','RECEIVED','INSPECTED','PROCESSED','CLOSED') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'PENDING',
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `return_number` (`return_number`),
  KEY `sales_order_id` (`sales_order_id`),
  KEY `purchase_order_id` (`purchase_order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_return_number` (`return_number`),
  KEY `idx_type` (`return_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `returns_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `returns_ibfk_2` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `returns_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `returns_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `returns_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Return headers';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_order_items`
--

DROP TABLE IF EXISTS `sales_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sales_order_id` int unsigned NOT NULL,
  `sales_order_line_id` int unsigned DEFAULT NULL,
  `device_id` int unsigned NOT NULL,
  `scanned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `verified` tinyint(1) DEFAULT '0',
  `shipped` tinyint(1) DEFAULT '0',
  `shipped_at` timestamp NULL DEFAULT NULL,
  `picked_by` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device` (`device_id`,`sales_order_id`),
  KEY `sales_order_line_id` (`sales_order_line_id`),
  KEY `picked_by` (`picked_by`),
  KEY `idx_so` (`sales_order_id`),
  KEY `idx_device` (`device_id`),
  KEY `idx_shipped` (`shipped`),
  CONSTRAINT `sales_order_items_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `sales_order_items_ibfk_2` FOREIGN KEY (`sales_order_line_id`) REFERENCES `sales_order_lines` (`id`),
  CONSTRAINT `sales_order_items_ibfk_3` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `sales_order_items_ibfk_4` FOREIGN KEY (`picked_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Actual devices picked for sales orders';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_order_lines`
--

DROP TABLE IF EXISTS `sales_order_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_order_lines` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sales_order_id` int unsigned NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `storage_gb` smallint unsigned DEFAULT NULL,
  `color` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `grade` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `supplier_id` int unsigned DEFAULT NULL,
  `location_id` int unsigned DEFAULT NULL,
  `requested_quantity` int unsigned NOT NULL DEFAULT '1',
  `picked_quantity` int unsigned DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `manufacturer_id` (`manufacturer_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `location_id` (`location_id`),
  KEY `idx_so` (`sales_order_id`),
  KEY `idx_model` (`model_id`),
  CONSTRAINT `sales_order_lines_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_order_lines_ibfk_2` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`),
  CONSTRAINT `sales_order_lines_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`),
  CONSTRAINT `sales_order_lines_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `sales_order_lines_ibfk_5` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=409594 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Sales order line items - requested device specs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales_orders`
--

DROP TABLE IF EXISTS `sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_orders` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `so_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` int unsigned NOT NULL,
  `order_type` enum('B2B','BACKMARKET') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'B2B',
  `backmarket_order_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `po_ref` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('DRAFT','CONFIRMED','PROCESSING','PARTIALLY_SHIPPED','SHIPPED','DELIVERED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'DRAFT',
  `courier` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tracking_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `total_boxes` smallint unsigned DEFAULT '0',
  `total_pallets` smallint unsigned DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` int unsigned NOT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `so_number` (`so_number`),
  KEY `created_by` (`created_by`),
  KEY `idx_so_number` (`so_number`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_type` (`order_type`),
  KEY `idx_backmarket` (`backmarket_order_id`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32768 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Sales order headers - B2B and Backmarket';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shipment_tracking`
--

DROP TABLE IF EXISTS `shipment_tracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_tracking` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `sales_order_id` int unsigned NOT NULL,
  `courier` enum('DPD','UPS','DHL','FEDEX','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tracking_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `current_status` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `tracking_events` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `estimated_delivery` date DEFAULT NULL,
  `actual_delivery` timestamp NULL DEFAULT NULL,
  `is_delivered` tinyint(1) DEFAULT '0',
  `last_checked` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_so` (`sales_order_id`),
  KEY `idx_tracking` (`tracking_number`),
  KEY `idx_courier` (`courier`),
  KEY `idx_delivered` (`is_delivered`),
  CONSTRAINT `shipment_tracking_ibfk_1` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders` (`id`),
  CONSTRAINT `shipment_tracking_chk_1` CHECK (json_valid(`tracking_events`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Shipment tracking across multiple couriers';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `storage_options`
--

DROP TABLE IF EXISTS `storage_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storage_options` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `gb_value` smallint unsigned NOT NULL,
  `display_label` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gb_value` (`gb_value`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Valid storage configurations for reference/validation';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `address_line1` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_line2` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `postcode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'United Kingdom',
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vat_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_code` (`supplier_code`),
  KEY `idx_code` (`supplier_code`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=206 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Supplier accounts';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tac_lookup`
--

DROP TABLE IF EXISTS `tac_lookup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tac_lookup` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tac_code` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `manufacturer_id` int unsigned NOT NULL,
  `model_id` int unsigned NOT NULL,
  `possible_storage` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `possible_colors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tac_code` (`tac_code`),
  KEY `manufacturer_id` (`manufacturer_id`),
  KEY `model_id` (`model_id`),
  KEY `idx_tac` (`tac_code`),
  CONSTRAINT `tac_lookup_ibfk_1` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturers` (`id`),
  CONSTRAINT `tac_lookup_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`),
  CONSTRAINT `tac_lookup_chk_1` CHECK (json_valid(`possible_storage`)),
  CONSTRAINT `tac_lookup_chk_2` CHECK (json_valid(`possible_colors`))
) ENGINE=InnoDB AUTO_INCREMENT=6407 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='TAC code lookup - maps IMEI prefix to device info with possible configurations';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `display_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('ADMIN','SALES','WAREHOUSE','QC','REPAIR','VIEWER') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'VIEWER',
  `pin_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='System users';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_awaiting_qc`
--

DROP TABLE IF EXISTS `v_awaiting_qc`;
/*!50001 DROP VIEW IF EXISTS `v_awaiting_qc`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_awaiting_qc` AS SELECT 
 1 AS `id`,
 1 AS `imei`,
 1 AS `manufacturer`,
 1 AS `model_name`,
 1 AS `po_number`,
 1 AS `supplier`,
 1 AS `location`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_awaiting_repair`
--

DROP TABLE IF EXISTS `v_awaiting_repair`;
/*!50001 DROP VIEW IF EXISTS `v_awaiting_repair`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_awaiting_repair` AS SELECT 
 1 AS `id`,
 1 AS `imei`,
 1 AS `manufacturer`,
 1 AS `model_name`,
 1 AS `po_number`,
 1 AS `supplier`,
 1 AS `location`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_dashboard_metrics`
--

DROP TABLE IF EXISTS `v_dashboard_metrics`;
/*!50001 DROP VIEW IF EXISTS `v_dashboard_metrics`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_dashboard_metrics` AS SELECT 
 1 AS `total_in_stock`,
 1 AS `unprocessed_orders`,
 1 AS `awaiting_qc`,
 1 AS `awaiting_repair`,
 1 AS `booked_in_7days`,
 1 AS `booked_out_7days`,
 1 AS `returns_7days`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_device_availability`
--

DROP TABLE IF EXISTS `v_device_availability`;
/*!50001 DROP VIEW IF EXISTS `v_device_availability`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_device_availability` AS SELECT 
 1 AS `supplier_id`,
 1 AS `supplier_name`,
 1 AS `manufacturer_id`,
 1 AS `manufacturer_name`,
 1 AS `model_id`,
 1 AS `model_name`,
 1 AS `model_number`,
 1 AS `storage_gb`,
 1 AS `color`,
 1 AS `grade`,
 1 AS `location_id`,
 1 AS `location_code`,
 1 AS `location_name`,
 1 AS `total_count`,
 1 AS `available_count`,
 1 AS `reserved_count`,
 1 AS `picked_count`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_recent_purchase_orders`
--

DROP TABLE IF EXISTS `v_recent_purchase_orders`;
/*!50001 DROP VIEW IF EXISTS `v_recent_purchase_orders`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_recent_purchase_orders` AS SELECT 
 1 AS `id`,
 1 AS `po_number`,
 1 AS `supplier_name`,
 1 AS `supplier_ref`,
 1 AS `status`,
 1 AS `expected_quantity`,
 1 AS `received_quantity`,
 1 AS `created_by`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_stock_summary`
--

DROP TABLE IF EXISTS `v_stock_summary`;
/*!50001 DROP VIEW IF EXISTS `v_stock_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_stock_summary` AS SELECT 
 1 AS `manufacturer`,
 1 AS `model_name`,
 1 AS `storage_gb`,
 1 AS `color`,
 1 AS `grade`,
 1 AS `quantity`,
 1 AS `location`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_unprocessed_sales_orders`
--

DROP TABLE IF EXISTS `v_unprocessed_sales_orders`;
/*!50001 DROP VIEW IF EXISTS `v_unprocessed_sales_orders`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_unprocessed_sales_orders` AS SELECT 
 1 AS `id`,
 1 AS `so_number`,
 1 AS `order_type`,
 1 AS `backmarket_order_id`,
 1 AS `customer_name`,
 1 AS `customer_ref`,
 1 AS `created_by`,
 1 AS `created_at`,
 1 AS `line_count`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'q2_base_db'
--

--
-- Dumping routines for database 'q2_base_db'
--

--
-- Final view structure for view `v_awaiting_qc`
--

/*!50001 DROP VIEW IF EXISTS `v_awaiting_qc`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_awaiting_qc` AS select `d`.`id` AS `id`,`d`.`imei` AS `imei`,`m`.`name` AS `manufacturer`,`mo`.`model_name` AS `model_name`,`po`.`po_number` AS `po_number`,`s`.`name` AS `supplier`,`l`.`code` AS `location`,`d`.`created_at` AS `created_at` from (((((`devices` `d` join `manufacturers` `m` on((`d`.`manufacturer_id` = `m`.`id`))) join `models` `mo` on((`d`.`model_id` = `mo`.`id`))) left join `purchase_orders` `po` on((`d`.`purchase_order_id` = `po`.`id`))) left join `suppliers` `s` on((`d`.`supplier_id` = `s`.`id`))) left join `locations` `l` on((`d`.`location_id` = `l`.`id`))) where ((`d`.`status` in ('AWAITING_QC','IN_QC')) and (`d`.`qc_completed` = 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_awaiting_repair`
--

/*!50001 DROP VIEW IF EXISTS `v_awaiting_repair`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_awaiting_repair` AS select `d`.`id` AS `id`,`d`.`imei` AS `imei`,`m`.`name` AS `manufacturer`,`mo`.`model_name` AS `model_name`,`po`.`po_number` AS `po_number`,`s`.`name` AS `supplier`,`l`.`code` AS `location`,`d`.`created_at` AS `created_at` from (((((`devices` `d` join `manufacturers` `m` on((`d`.`manufacturer_id` = `m`.`id`))) join `models` `mo` on((`d`.`model_id` = `mo`.`id`))) left join `purchase_orders` `po` on((`d`.`purchase_order_id` = `po`.`id`))) left join `suppliers` `s` on((`d`.`supplier_id` = `s`.`id`))) left join `locations` `l` on((`d`.`location_id` = `l`.`id`))) where ((`d`.`status` in ('AWAITING_REPAIR','IN_REPAIR')) and (`d`.`repair_completed` = 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_dashboard_metrics`
--

/*!50001 DROP VIEW IF EXISTS `v_dashboard_metrics`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_dashboard_metrics` AS select (select count(0) from `devices` where (`devices`.`status` = 'IN_STOCK')) AS `total_in_stock`,(select count(0) from `sales_orders` where (`sales_orders`.`status` in ('DRAFT','CONFIRMED','PROCESSING'))) AS `unprocessed_orders`,(select count(0) from `devices` where (`devices`.`status` in ('AWAITING_QC','IN_QC'))) AS `awaiting_qc`,(select count(0) from `devices` where (`devices`.`status` in ('AWAITING_REPAIR','IN_REPAIR'))) AS `awaiting_repair`,(select count(0) from `devices` where (`devices`.`created_at` >= (now() - interval 7 day))) AS `booked_in_7days`,(select count(0) from (`sales_order_items` `soi` join `sales_orders` `so` on((`soi`.`sales_order_id` = `so`.`id`))) where ((`soi`.`shipped` = 1) and (`soi`.`shipped_at` >= (now() - interval 7 day)))) AS `booked_out_7days`,(select count(0) from `returns` where (`returns`.`created_at` >= (now() - interval 7 day))) AS `returns_7days` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_device_availability`
--

/*!50001 DROP VIEW IF EXISTS `v_device_availability`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`quant`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_device_availability` AS select `d`.`supplier_id` AS `supplier_id`,`s`.`name` AS `supplier_name`,`d`.`manufacturer_id` AS `manufacturer_id`,`m`.`name` AS `manufacturer_name`,`d`.`model_id` AS `model_id`,`mo`.`model_name` AS `model_name`,`mo`.`model_number` AS `model_number`,`d`.`storage_gb` AS `storage_gb`,`d`.`color` AS `color`,`d`.`grade` AS `grade`,`d`.`location_id` AS `location_id`,`l`.`code` AS `location_code`,`l`.`name` AS `location_name`,count(`d`.`id`) AS `total_count`,sum((case when ((`d`.`status` = 'IN_STOCK') and (`d`.`reserved_for_so_id` is null)) then 1 else 0 end)) AS `available_count`,sum((case when (`d`.`reserved_for_so_id` is not null) then 1 else 0 end)) AS `reserved_count`,sum((case when (`d`.`status` = 'PICKED') then 1 else 0 end)) AS `picked_count` from ((((`devices` `d` join `suppliers` `s` on((`d`.`supplier_id` = `s`.`id`))) join `manufacturers` `m` on((`d`.`manufacturer_id` = `m`.`id`))) join `models` `mo` on((`d`.`model_id` = `mo`.`id`))) left join `locations` `l` on((`d`.`location_id` = `l`.`id`))) where (`d`.`status` in ('IN_STOCK','PICKED')) group by `d`.`supplier_id`,`s`.`name`,`d`.`manufacturer_id`,`m`.`name`,`d`.`model_id`,`mo`.`model_name`,`mo`.`model_number`,`d`.`storage_gb`,`d`.`color`,`d`.`grade`,`d`.`location_id`,`l`.`code`,`l`.`name` having (`total_count` > 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_recent_purchase_orders`
--

/*!50001 DROP VIEW IF EXISTS `v_recent_purchase_orders`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_recent_purchase_orders` AS select `po`.`id` AS `id`,`po`.`po_number` AS `po_number`,`s`.`name` AS `supplier_name`,`po`.`supplier_ref` AS `supplier_ref`,`po`.`status` AS `status`,`po`.`expected_quantity` AS `expected_quantity`,`po`.`received_quantity` AS `received_quantity`,`u`.`display_name` AS `created_by`,`po`.`created_at` AS `created_at` from ((`purchase_orders` `po` join `suppliers` `s` on((`po`.`supplier_id` = `s`.`id`))) join `users` `u` on((`po`.`created_by` = `u`.`id`))) order by `po`.`created_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_stock_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_stock_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_stock_summary` AS select `m`.`name` AS `manufacturer`,`mo`.`model_name` AS `model_name`,`d`.`storage_gb` AS `storage_gb`,`d`.`color` AS `color`,`d`.`grade` AS `grade`,count(0) AS `quantity`,`l`.`code` AS `location` from (((`devices` `d` join `manufacturers` `m` on((`d`.`manufacturer_id` = `m`.`id`))) join `models` `mo` on((`d`.`model_id` = `mo`.`id`))) left join `locations` `l` on((`d`.`location_id` = `l`.`id`))) where (`d`.`status` = 'IN_STOCK') group by `m`.`id`,`mo`.`id`,`d`.`storage_gb`,`d`.`color`,`d`.`grade`,`l`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_unprocessed_sales_orders`
--

/*!50001 DROP VIEW IF EXISTS `v_unprocessed_sales_orders`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_unprocessed_sales_orders` AS select `so`.`id` AS `id`,`so`.`so_number` AS `so_number`,`so`.`order_type` AS `order_type`,`so`.`backmarket_order_id` AS `backmarket_order_id`,`c`.`name` AS `customer_name`,`so`.`customer_ref` AS `customer_ref`,`u`.`display_name` AS `created_by`,`so`.`created_at` AS `created_at`,count(`sol`.`id`) AS `line_count` from (((`sales_orders` `so` join `customers` `c` on((`so`.`customer_id` = `c`.`id`))) join `users` `u` on((`so`.`created_by` = `u`.`id`))) left join `sales_order_lines` `sol` on((`so`.`id` = `sol`.`sales_order_id`))) where (`so`.`status` in ('DRAFT','CONFIRMED','PROCESSING')) group by `so`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-09 10:43:56
