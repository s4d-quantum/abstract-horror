-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: s4d_england_db
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
-- Table structure for table `bad_imei_audit`
--

DROP TABLE IF EXISTS `bad_imei_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bad_imei_audit` (
  `id` int NOT NULL DEFAULT '0',
  `item_imei` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `status` int DEFAULT NULL,
  `item_color` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `suggested_fix` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reviewer_note` text COLLATE utf8mb4_general_ci,
  `luhn_valid` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dpd_status`
--

DROP TABLE IF EXISTS `dpd_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dpd_status` (
  `order_id` int NOT NULL,
  `tracking_no` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `parcel_status` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `level3_repair`
--

DROP TABLE IF EXISTS `level3_repair`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `level3_repair` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `manufacturer` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `item_imei` bigint DEFAULT NULL,
  `fault` text COLLATE utf8mb4_general_ci,
  `engineer_notes` text COLLATE utf8mb4_general_ci,
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tray_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=486 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accessories_order_return`
--

DROP TABLE IF EXISTS `tbl_accessories_order_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accessories_order_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accessories_orders`
--

DROP TABLE IF EXISTS `tbl_accessories_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accessories_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `po_box` varchar(10) DEFAULT NULL,
  `delivery_company` varchar(50) DEFAULT NULL,
  `total_pallets` int DEFAULT NULL,
  `total_boxes` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`,`product_id`,`item_qty`,`customer_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2013 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accessories_products`
--

DROP TABLE IF EXISTS `tbl_accessories_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accessories_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) DEFAULT NULL,
  `item_brand` varchar(100) DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=184 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accessories_purchase_return`
--

DROP TABLE IF EXISTS `tbl_accessories_purchase_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accessories_purchase_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `return_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accessories_purchases`
--

DROP TABLE IF EXISTS `tbl_accessories_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accessories_purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `supplier_id` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `tray_id` varchar(100) DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  `po_ref` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=679 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accounts`
--

DROP TABLE IF EXISTS `tbl_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_name` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_db` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_password` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `user_role` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `user_email` (`user_email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accounts_14-7-23`
--

DROP TABLE IF EXISTS `tbl_accounts_14-7-23`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accounts_14-7-23` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `user_email` varchar(100) DEFAULT NULL,
  `user_password` varchar(100) DEFAULT NULL,
  `user_phone` varchar(100) DEFAULT NULL,
  `user_role` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`user_email`),
  UNIQUE KEY `user_email` (`user_email`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_accounts_old`
--

DROP TABLE IF EXISTS `tbl_accounts_old`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_accounts_old` (
  `user_id` int NOT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `user_email` varchar(100) DEFAULT NULL,
  `user_password` varchar(100) DEFAULT NULL,
  `user_phone` varchar(100) DEFAULT NULL,
  `user_role` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_adminops`
--

DROP TABLE IF EXISTS `tbl_adminops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_adminops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL DEFAULT (curdate()),
  `time` time NOT NULL DEFAULT (curtime()),
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `date` (`date`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1312 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_adminops_devices`
--

DROP TABLE IF EXISTS `tbl_adminops_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_adminops_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adminop_id` int NOT NULL,
  `item_imei` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_tray_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_tray_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `adminop_id` (`adminop_id`),
  KEY `item_imei` (`item_imei`),
  KEY `old_tray_id` (`old_tray_id`),
  KEY `new_tray_id` (`new_tray_id`),
  CONSTRAINT `tbl_adminops_devices_ibfk_1` FOREIGN KEY (`adminop_id`) REFERENCES `tbl_adminops` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9285 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_bm2`
--

DROP TABLE IF EXISTS `tbl_bm2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_bm2` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bm_order_id` bigint NOT NULL,
  `company` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `street` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `street_2` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `country` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `delivery_note` text COLLATE utf8mb4_general_ci,
  `orderlines` longtext COLLATE utf8mb4_general_ci,
  `consignment_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `parcel_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `shipment_no` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shipment_id` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_building_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_thoroughfare` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_line_1` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_line_2` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_line_3` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_line_4` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_postcode` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_town` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_county` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_country` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `v_status` int DEFAULT NULL COMMENT 'Validation status: 0=not validated, 1=validated, 2=failed, 3=manual_review_required',
  `date` date NOT NULL DEFAULT (curdate()),
  `v_validated_at` datetime DEFAULT NULL COMMENT 'When validation was performed',
  `v_match_level` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Match level from Ideal Postcodes API',
  `v_confidence_score` decimal(3,2) DEFAULT NULL COMMENT 'Validation confidence score 0.00-1.00',
  `v_api_response` text COLLATE utf8mb4_general_ci COMMENT 'Full API response for debugging',
  PRIMARY KEY (`id`),
  KEY `idx_tbl_bm2_v_status` (`v_status`),
  KEY `idx_tbl_bm2_v_validated_at` (`v_validated_at`),
  KEY `idx_tbl_bm2_validation_quality` (`v_status`,`v_confidence_score`)
) ENGINE=InnoDB AUTO_INCREMENT=3719 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_categories`
--

DROP TABLE IF EXISTS `tbl_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) DEFAULT NULL,
  `category_id` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id` (`id`),
  KEY `idx_categories_category_id` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_customers`
--

DROP TABLE IF EXISTS `tbl_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `address` varchar(100) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `address2` varchar(100) DEFAULT NULL,
  `postcode` varchar(10) DEFAULT NULL,
  `vat` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customers_customer_id` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_feedback`
--

DROP TABLE IF EXISTS `tbl_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `comment` text COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'open',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_flash_descriptions`
--

DROP TABLE IF EXISTS `tbl_flash_descriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_flash_descriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `desc_id` int DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_gb`
--

DROP TABLE IF EXISTS `tbl_gb`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_gb` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gb_value` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_grades`
--

DROP TABLE IF EXISTS `tbl_grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_grades` (
  `grade_id` int NOT NULL,
  `title` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`grade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_imei`
--

DROP TABLE IF EXISTS `tbl_imei`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_imei` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_imei` varchar(100) DEFAULT NULL,
  `item_tac` varchar(100) DEFAULT NULL,
  `item_color` varchar(100) DEFAULT NULL,
  `oem_color` varchar(100) DEFAULT NULL,
  `goodsin_color` varchar(100) DEFAULT NULL,
  `item_grade` int DEFAULT '0',
  `item_gb` varchar(100) DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `status` int DEFAULT NULL,
  `unit_confirmed` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `in_sales_order` int DEFAULT NULL COMMENT 'Stores sales order ID when reserved',
  PRIMARY KEY (`id`),
  KEY `id` (`id`),
  KEY `item_imei` (`item_imei`,`item_tac`,`purchase_id`,`status`),
  KEY `idx_imei_basic` (`item_imei`,`item_tac`,`status`),
  KEY `idx_imei_status_tac_imei` (`status`,`item_tac`,`item_imei`),
  KEY `idx_imei_tac_purchase_status` (`item_tac`,`purchase_id`,`status`),
  KEY `idx_imei_purchase_status` (`purchase_id`,`status`),
  KEY `idx_imei_imei` (`item_imei`)
) ENGINE=InnoDB AUTO_INCREMENT=386549 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_imei_sales_orders`
--

DROP TABLE IF EXISTS `tbl_imei_sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_imei_sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `customer_id` varchar(10) DEFAULT NULL,
  `item_brand` varchar(100) DEFAULT NULL,
  `item_details` varchar(100) DEFAULT NULL,
  `item_color` varchar(100) DEFAULT NULL,
  `item_grade` varchar(10) DEFAULT NULL,
  `item_gb` varchar(10) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `tray_id` varchar(100) DEFAULT NULL,
  `is_completed` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `goodsout_order_id` int DEFAULT NULL,
  `po_ref` varchar(100) DEFAULT NULL,
  `customer_ref` varchar(100) DEFAULT NULL,
  `supplier_id` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_imei_sales_orders_code_complete` (`item_code`,`is_completed`),
  KEY `idx_imei_sales_orders_order_id` (`order_id`),
  KEY `idx_sales_orders_customer_date` (`customer_id`,`date`),
  KEY `idx_sales_orders_order_id` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=635815 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_log`
--

DROP TABLE IF EXISTS `tbl_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `details` varchar(100) DEFAULT NULL,
  `ref` varchar(100) DEFAULT NULL,
  `auto_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_id` (`id`),
  KEY `idx_item_code_id` (`item_code`,`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3948141 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_log20-7-2023(user_id shuffled)`
--

DROP TABLE IF EXISTS `tbl_log20-7-2023(user_id shuffled)`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_log20-7-2023(user_id shuffled)` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `details` varchar(100) DEFAULT NULL,
  `ref` varchar(100) DEFAULT NULL,
  `auto_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_id` (`id`),
  KEY `idx_date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=2226899 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_log_010125`
--

DROP TABLE IF EXISTS `tbl_log_010125`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_log_010125` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `details` varchar(100) DEFAULT NULL,
  `ref` varchar(100) DEFAULT NULL,
  `auto_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3053646 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_log_17-7-23`
--

DROP TABLE IF EXISTS `tbl_log_17-7-23`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_log_17-7-23` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `details` varchar(100) DEFAULT NULL,
  `ref` varchar(100) DEFAULT NULL,
  `auto_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_id` (`id`),
  KEY `idx_date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=2222926 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_order_return`
--

DROP TABLE IF EXISTS `tbl_order_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_order_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_id` int DEFAULT NULL,
  `item_imei` varchar(100) DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11450 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_orders`
--

DROP TABLE IF EXISTS `tbl_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `item_imei` varchar(100) DEFAULT NULL,
  `customer_id` varchar(100) NOT NULL,
  `date` date NOT NULL,
  `po_box` varchar(100) DEFAULT NULL,
  `tracking_no` varchar(50) DEFAULT NULL,
  `customer_ref` varchar(100) DEFAULT NULL,
  `delivery_company` varchar(100) DEFAULT NULL,
  `total_boxes` int DEFAULT NULL,
  `total_pallets` int DEFAULT NULL,
  `order_return` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `unit_confirmed` int DEFAULT NULL,
  `has_return_tag` int DEFAULT NULL,
  `is_delivered` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `item_imei` (`item_imei`),
  KEY `order_return` (`order_return`,`user_id`),
  KEY `idx_orders_order_id_return` (`order_id`,`order_return`),
  KEY `idx_orders_is_delivered` (`is_delivered`),
  KEY `idx_orders_date` (`date`),
  KEY `idx_orders_customer_date` (`customer_id`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=422239 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_parts_order_return`
--

DROP TABLE IF EXISTS `tbl_parts_order_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_parts_order_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_parts_orders`
--

DROP TABLE IF EXISTS `tbl_parts_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_parts_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `linked_pid` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`,`product_id`,`item_qty`,`customer_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4467 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_parts_products`
--

DROP TABLE IF EXISTS `tbl_parts_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_parts_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) DEFAULT NULL,
  `item_brand` varchar(100) DEFAULT NULL,
  `item_model` varchar(100) DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `item_color` varchar(100) DEFAULT NULL,
  `item_tac` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=969 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_parts_purchase_return`
--

DROP TABLE IF EXISTS `tbl_parts_purchase_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_parts_purchase_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `return_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=472 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_parts_purchases`
--

DROP TABLE IF EXISTS `tbl_parts_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_parts_purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `item_qty` int DEFAULT NULL,
  `supplier_id` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `tray_id` varchar(100) DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  `po_ref` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6723 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_purchase_return`
--

DROP TABLE IF EXISTS `tbl_purchase_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_purchase_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `return_id` int DEFAULT NULL,
  `item_imei` varchar(100) DEFAULT NULL,
  `date` varchar(100) DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  `tracking_no` varchar(50) DEFAULT NULL,
  `delivery_company` varchar(100) DEFAULT NULL,
  `is_delivered` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `return_id` (`return_id`,`item_imei`,`purchase_id`)
) ENGINE=InnoDB AUTO_INCREMENT=42570 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_purchases`
--

DROP TABLE IF EXISTS `tbl_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `item_imei` varchar(100) DEFAULT NULL,
  `date` date NOT NULL,
  `supplier_id` varchar(10) NOT NULL,
  `tray_id` varchar(100) DEFAULT NULL,
  `qc_required` int DEFAULT NULL,
  `qc_completed` int DEFAULT NULL,
  `repair_required` int DEFAULT NULL,
  `repair_completed` int DEFAULT NULL,
  `purchase_return` int DEFAULT NULL,
  `priority` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  `po_ref` varchar(50) DEFAULT NULL,
  `has_return_tag` int DEFAULT NULL,
  `unit_confirmed` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_purchases_full` (`item_imei`,`supplier_id`,`purchase_return`,`qc_required`,`qc_completed`,`purchase_id`),
  KEY `idx_purchases_qc_supplier` (`qc_required`,`supplier_id`,`purchase_id`),
  KEY `idx_purchases_qc_repair_combo` (`qc_required`,`repair_required`,`repair_completed`,`supplier_id`,`purchase_id`,`id`),
  KEY `idx_purchases_date_id` (`date`,`purchase_id`),
  KEY `idx_purchases_supplier_date` (`supplier_id`,`date`,`purchase_id`),
  KEY `idx_purchases_supplier_simple` (`supplier_id`,`purchase_id`),
  KEY `idx_purchases_imei_supplier_opt` (`item_imei`,`supplier_id`,`purchase_return`,`qc_required`,`qc_completed`),
  KEY `idx_repair_purchase_id` (`repair_required`,`purchase_id`,`id`),
  KEY `idx_qc_required_completed` (`qc_required`,`qc_completed`,`purchase_id`),
  KEY `idx_purchases_tray_return` (`tray_id`,`purchase_return`),
  KEY `idx_purchases_item_imei` (`item_imei`),
  KEY `idx_purchases_priority_supplier` (`priority`,`date`,`supplier_id`),
  KEY `idx_purchases_optimized` (`priority`,`supplier_id`,`date`),
  KEY `idx_purchases_purchase_id` (`purchase_id`),
  KEY `idx_purchases_date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=418592 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_qc_imei_products`
--

DROP TABLE IF EXISTS `tbl_qc_imei_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_qc_imei_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `item_comments` varchar(1000) DEFAULT NULL,
  `item_cosmetic_passed` int DEFAULT NULL,
  `item_functional_passed` int DEFAULT NULL,
  `item_flashed` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `item_eu` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_code` (`item_code`,`item_comments`(767),`item_cosmetic_passed`,`item_functional_passed`,`item_flashed`,`user_id`),
  KEY `idx_qc_check` (`item_code`,`purchase_id`,`item_cosmetic_passed`,`item_functional_passed`)
) ENGINE=InnoDB AUTO_INCREMENT=182326 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_qc_serial_products`
--

DROP TABLE IF EXISTS `tbl_qc_serial_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_qc_serial_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `item_comments` varchar(1000) DEFAULT NULL,
  `item_cosmetic_passed` int DEFAULT NULL,
  `item_functional_passed` int DEFAULT NULL,
  `item_flashed` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `item_eu` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`,`item_code`,`item_comments`(767),`item_cosmetic_passed`,`item_functional_passed`,`item_flashed`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10566 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_repair_imei_parts`
--

DROP TABLE IF EXISTS `tbl_repair_imei_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_repair_imei_parts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(50) DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `part_id` int DEFAULT NULL,
  `part_qty` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_code` (`item_code`,`purchase_id`,`part_id`)
) ENGINE=InnoDB AUTO_INCREMENT=120783 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_repair_imei_products`
--

DROP TABLE IF EXISTS `tbl_repair_imei_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_repair_imei_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` varchar(10) DEFAULT NULL,
  `item_code` varchar(50) DEFAULT NULL,
  `item_comments` varchar(100) DEFAULT NULL,
  `user_id` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`,`item_code`),
  KEY `item_comments` (`item_comments`)
) ENGINE=InnoDB AUTO_INCREMENT=480 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_serial_order_return`
--

DROP TABLE IF EXISTS `tbl_serial_order_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_serial_order_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `return_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=801 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_serial_orders`
--

DROP TABLE IF EXISTS `tbl_serial_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_serial_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `po_box` varchar(100) DEFAULT NULL,
  `delivery_company` varchar(100) DEFAULT NULL,
  `total_boxes` int DEFAULT NULL,
  `total_pallets` int DEFAULT NULL,
  `order_return` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `unit_confirmed` int DEFAULT NULL,
  `has_return_tag` int DEFAULT NULL,
  `is_delivered` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `customer_id` (`customer_id`),
  KEY `item_code` (`item_code`,`order_return`)
) ENGINE=InnoDB AUTO_INCREMENT=98814 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_serial_products`
--

DROP TABLE IF EXISTS `tbl_serial_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_serial_products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `item_grade` int DEFAULT NULL,
  `item_brand` varchar(100) DEFAULT NULL,
  `item_details` varchar(1000) DEFAULT NULL,
  `status` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`,`item_code`,`item_brand`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=81462 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_serial_purchase_return`
--

DROP TABLE IF EXISTS `tbl_serial_purchase_return`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_serial_purchase_return` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `return_id` int DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4306 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_serial_purchases`
--

DROP TABLE IF EXISTS `tbl_serial_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_serial_purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `supplier_id` varchar(100) DEFAULT NULL,
  `tray_id` varchar(100) DEFAULT NULL,
  `qc_required` int DEFAULT NULL,
  `qc_completed` int DEFAULT NULL,
  `purchase_return` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `report_comment` varchar(500) DEFAULT NULL,
  `priority` int DEFAULT NULL,
  `po_ref` varchar(50) DEFAULT NULL,
  `has_return_tag` int DEFAULT NULL,
  `unit_confirmed` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`,`item_code`,`supplier_id`,`qc_required`,`qc_completed`,`purchase_return`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=80063 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_serial_sales_orders`
--

DROP TABLE IF EXISTS `tbl_serial_sales_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_serial_sales_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT NULL,
  `customer_id` varchar(10) DEFAULT NULL,
  `item_brand` varchar(100) DEFAULT NULL,
  `item_details` varchar(100) DEFAULT NULL,
  `item_color` varchar(100) DEFAULT NULL,
  `item_grade` varchar(10) DEFAULT NULL,
  `item_gb` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `tray_id` varchar(100) DEFAULT NULL,
  `is_completed` int DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `goodsout_order_id` int DEFAULT NULL,
  `po_ref` varchar(100) DEFAULT NULL,
  `supplier_id` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=130569 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_settings`
--

DROP TABLE IF EXISTS `tbl_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dpd_user` varchar(50) DEFAULT NULL,
  `dpd_pass` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `company_title` varchar(100) DEFAULT NULL,
  `logo_image` varchar(200) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `vat` varchar(30) DEFAULT NULL,
  `eroi_no` varchar(30) DEFAULT NULL,
  `company_registration_no` varchar(30) DEFAULT NULL,
  `address` varchar(100) DEFAULT NULL,
  `city` varchar(30) DEFAULT NULL,
  `country` varchar(20) DEFAULT NULL,
  `bm_collection_cutoff` varchar(5) DEFAULT '13:30',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_subcategories`
--

DROP TABLE IF EXISTS `tbl_subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_subcategories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subcategory_id` varchar(100) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `category_id` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_suppliers`
--

DROP TABLE IF EXISTS `tbl_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `address` varchar(100) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `address2` varchar(100) DEFAULT NULL,
  `postcode` varchar(10) DEFAULT NULL,
  `vat` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=272 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_tac`
--

DROP TABLE IF EXISTS `tbl_tac`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_tac` (
  `item_tac` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `item_details` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `item_brand` varchar(100) DEFAULT NULL,
  `item_gb1` int DEFAULT NULL,
  `item_color1` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `item_tac` (`item_tac`,`item_details`,`item_brand`),
  KEY `idx_tac_tac_brand` (`item_tac`,`item_brand`),
  KEY `idx_tac_brand_tac` (`item_brand`,`item_tac`)
) ENGINE=InnoDB AUTO_INCREMENT=5237 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbl_trays`
--

DROP TABLE IF EXISTS `tbl_trays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_trays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tray_id` varchar(100) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `locked` tinyint(1) NOT NULL DEFAULT '0',
  `locked_by` int DEFAULT NULL,
  `locked_at` datetime DEFAULT NULL,
  `lock_note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trays_tray_id` (`tray_id`)
) ENGINE=InnoDB AUTO_INCREMENT=312 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_imei_lookup`
--

DROP TABLE IF EXISTS `v_imei_lookup`;
/*!50001 DROP VIEW IF EXISTS `v_imei_lookup`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_imei_lookup` AS SELECT 
 1 AS `item_imei`,
 1 AS `brand_name`,
 1 AS `model_name`,
 1 AS `item_color`,
 1 AS `item_gb`,
 1 AS `grade_title`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 's4d_england_db'
--

--
-- Dumping routines for database 's4d_england_db'
--

--
-- Final view structure for view `v_imei_lookup`
--

/*!50001 DROP VIEW IF EXISTS `v_imei_lookup`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pgloader`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_imei_lookup` AS select `i`.`item_imei` AS `item_imei`,`c`.`title` AS `brand_name`,`t`.`item_details` AS `model_name`,`i`.`item_color` AS `item_color`,`i`.`item_gb` AS `item_gb`,`g`.`title` AS `grade_title` from (((`tbl_imei` `i` left join `tbl_tac` `t` on((`t`.`item_tac` = left(`i`.`item_imei`,8)))) left join `tbl_categories` `c` on((`c`.`category_id` = `t`.`item_brand`))) left join `tbl_grades` `g` on((`g`.`grade_id` = `i`.`item_grade`))) */;
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

-- Dump completed on 2026-04-09 10:43:55
