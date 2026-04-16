CREATE TABLE IF NOT EXISTS `quantum_event_outbox` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` VARCHAR(100) DEFAULT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `source_user` VARCHAR(100) DEFAULT NULL,
  `source_file` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME DEFAULT NULL,
  `processing_status` ENUM('pending','processed','failed','ignored') NOT NULL DEFAULT 'pending',
  `processing_error` TEXT DEFAULT NULL,
  `idempotency_key` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_quantum_event_outbox_idempotency_key` (`idempotency_key`),
  KEY `idx_quantum_event_outbox_pending` (`processing_status`, `id`),
  KEY `idx_quantum_event_outbox_event_type` (`event_type`),
  KEY `idx_quantum_event_outbox_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
