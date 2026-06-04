-- ============================================================
-- CargoTrack v3.0 — Konsolide Veritabanı Şeması
-- WordPress prefix'i kaldırıldı, FK ilişkileri eklendi
-- Tüm maybe_update_db ALTER kolonları orijinal CREATE'e dahil edildi
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

-- ====================== USERS ======================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `email` VARCHAR(200),
  `role` ENUM('super_admin','admin','user') NOT NULL DEFAULT 'admin',
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== PARTNERS ======================
CREATE TABLE IF NOT EXISTS `partners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `partner_code` VARCHAR(20) DEFAULT '',
  `type` ENUM('customer','receiver','sender','agent') NOT NULL DEFAULT 'customer',
  `extra_roles` VARCHAR(200) DEFAULT '',
  `company_name` VARCHAR(200) NOT NULL,
  `physical_address` TEXT,
  `postal_code` VARCHAR(20),
  `city` VARCHAR(100),
  `country` VARCHAR(100),
  `contact_person` VARCHAR(200),
  `contact_email` VARCHAR(200),
  `contact_phone` VARCHAR(100),
  `tax_number` VARCHAR(100),
  `mersis_number` VARCHAR(100),
  `eori_number` VARCHAR(100),
  `billing_address` TEXT,
  `billing_email` VARCHAR(200),
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_partner_type` (`type`),
  INDEX `idx_partner_company` (`company_name`),
  CONSTRAINT `fk_partner_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== WAREHOUSES ======================
-- Tip kodları (Fransa CGI uyumlu): R/S/T = entrepôt I/II/III, U = privé,
-- V = temporaire, Y = autre que douanier, Z = zone franche
CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `warehouse_code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `type_code` VARCHAR(5) NOT NULL DEFAULT 'U',
  `address` TEXT,
  `postal_code` VARCHAR(20),
  `city` VARCHAR(100),
  `country` VARCHAR(100),
  `capacity_info` VARCHAR(200),
  `responsible_person` VARCHAR(200),
  `contact_phone` VARCHAR(100),
  `contact_email` VARCHAR(200),
  `notes` TEXT,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_warehouse_status` (`status`),
  CONSTRAINT `fk_warehouse_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== VEHICLES ======================
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicle_code` VARCHAR(20) NOT NULL UNIQUE,
  `transport_type` VARCHAR(20) NOT NULL DEFAULT 'road',
  `plate` VARCHAR(30) NOT NULL,
  `trailer_plate` VARCHAR(30) DEFAULT '',
  `volume_m3` DECIMAL(10,2) DEFAULT 0,
  `capacity_kg` DECIMAL(12,2) DEFAULT 0,
  `equipment_type` VARCHAR(30) DEFAULT 'tilt',
  `adr_certified` TINYINT(1) DEFAULT 0,
  `brand_model` VARCHAR(150) DEFAULT '',
  `driver_name` VARCHAR(150) DEFAULT '',
  `driver_phone` VARCHAR(50) DEFAULT '',
  `registration_date` DATE DEFAULT NULL,
  `mode_data` LONGTEXT DEFAULT NULL,
  `notes` TEXT,
  `status` ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vehicle_status` (`status`),
  INDEX `idx_vehicle_transport` (`transport_type`),
  CONSTRAINT `fk_vehicle_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== SHIPMENTS ======================
CREATE TABLE IF NOT EXISTS `shipments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shipment_no` VARCHAR(50) NOT NULL UNIQUE,
  `transport_type` ENUM('maritime','road','air','import','export','storage') NOT NULL DEFAULT 'road',
  `status` ENUM('draft','in_progress','to_invoice','closed') NOT NULL DEFAULT 'draft',
  `created_date` DATE,
  `responsible_user` VARCHAR(200),
  `client_reference` VARCHAR(200),

  -- Taraflar
  `client_billing` VARCHAR(200),
  `sender` VARCHAR(200),
  `receiver` VARCHAR(200),
  `agent` VARCHAR(200),
  `client_contact` VARCHAR(500),
  `client_phone` VARCHAR(100) DEFAULT '',
  `client_email` VARCHAR(200) DEFAULT '',
  `client_delivery_address` TEXT,
  `departure_country` VARCHAR(100),
  `arrival_country` VARCHAR(100),
  -- Taraflar için sevkiyata özel ek bilgi (2. adres, kontak, vs.)
  -- Yapı: { "client": {...}, "sender": {...}, "receiver": {...}, "agent": {...} }
  `parties_data` JSON,

  -- Yük Bilgileri
  `goods_description` TEXT,
  `hs_code` VARCHAR(50),
  `gross_weight` DECIMAL(10,2),
  `net_weight` DECIMAL(10,2),
  `volume_cbm` DECIMAL(10,2),
  `dimensions` VARCHAR(100),
  `quantity` INT,
  `package_count` INT,
  `pallets` TINYINT(1) DEFAULT 0,
  `package_type` VARCHAR(100),
  `package_type_custom` VARCHAR(100) DEFAULT '',
  `dangerous_goods` TINYINT(1) DEFAULT 0,
  `adr_code` VARCHAR(100) DEFAULT '',
  `temperature_controlled` TINYINT(1) DEFAULT 0,
  `temperature_min` DECIMAL(6,2) DEFAULT NULL,
  `temperature_max` DECIMAL(6,2) DEFAULT NULL,
  `incoterm` VARCHAR(20),
  `incoterm_location` VARCHAR(200),
  `incoterm_postal` VARCHAR(20) DEFAULT '',
  `incoterm_city` VARCHAR(100) DEFAULT '',
  `incoterm_country_field` VARCHAR(100) DEFAULT '',
  `insurance` TINYINT(1) DEFAULT 0,
  `goods_value` DECIMAL(15,2),
  `crates_data` TEXT DEFAULT NULL,

  -- Finansal
  `purchase_price` DECIMAL(15,2),
  `sale_price` DECIMAL(15,2),
  `freight_cost` DECIMAL(15,2),
  `customs_cost` DECIMAL(15,2),
  `transport_handling` DECIMAL(15,2),
  `storage_handling` DECIMAL(15,2),
  `storage_cost` DECIMAL(15,2),
  `insurance_cost` DECIMAL(15,2),
  `other_costs` DECIMAL(15,2),
  `currency_code` VARCHAR(10) DEFAULT 'EUR',
  `financial_data` LONGTEXT DEFAULT NULL,

  -- Belgeler (eski basit JSON + yeni detaylı)
  `documents` JSON,
  `documents_data` LONGTEXT DEFAULT NULL,

  -- Depolama (genel + detay)
  `warehouse` VARCHAR(200),
  `entry_date` DATE,
  `exit_date` DATE,
  `daily_rate` DECIMAL(10,2),
  `handling_fee` DECIMAL(10,2),
  `other_storage_fees` DECIMAL(10,2),
  `storage_data` LONGTEXT DEFAULT NULL,
  `depo_stock_log` LONGTEXT DEFAULT NULL,
  `depo_kap_sayisi` INT DEFAULT 0,
  `depo_ucret_tipi` VARCHAR(10) DEFAULT 'gun',
  `depo_gun_ucret` DECIMAL(10,2) DEFAULT 0,
  `depo_hafta_ucret` DECIMAL(10,2) DEFAULT 0,
  `depo_ay_ucret` DECIMAL(10,2) DEFAULT 0,
  `depo_musteri` VARCHAR(200) DEFAULT '',
  `depo_gunluk_ucret` DECIMAL(10,2) DEFAULT 0,
  `depo_toplam_satis` DECIMAL(15,2) DEFAULT 0,

  -- Elleçleme
  `ellecleme_filmleme` DECIMAL(10,2) DEFAULT 0,
  `ellecleme_paletleme` DECIMAL(10,2) DEFAULT 0,
  `ellecleme_etiketleme` DECIMAL(10,2) DEFAULT 0,
  `ellecleme_depo_giris` DECIMAL(10,2) DEFAULT 0,
  `ellecleme_depo_cikis` DECIMAL(10,2) DEFAULT 0,

  -- Mode-specific JSON (maritime/air detayları)
  `mode_data` LONGTEXT DEFAULT NULL,

  -- Fatura
  `invoice_generated` TINYINT(1) DEFAULT 0,
  `invoice_no` VARCHAR(50),
  `invoice_date` DATE,
  `invoice_amount` DECIMAL(15,2),
  `payment_received` TINYINT(1) DEFAULT 0,
  `payment_type` VARCHAR(50) DEFAULT '',
  `payment_notes` TEXT DEFAULT NULL,

  -- Meta
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_shipment_type` (`transport_type`),
  INDEX `idx_shipment_status` (`status`),
  INDEX `idx_shipment_created_by` (`created_by`),
  INDEX `idx_shipment_created_at` (`created_at`),
  INDEX `idx_shipment_client` (`client_billing`),
  CONSTRAINT `fk_shipment_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== VEHICLE ASSIGNMENTS ======================
-- Many-to-many: vehicle <-> shipment, miktar/ağırlık bölünebilir
CREATE TABLE IF NOT EXISTS `vehicle_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicle_id` INT NOT NULL,
  `shipment_id` INT NOT NULL,
  `assigned_quantity` INT DEFAULT 0,
  `assigned_weight` DECIMAL(12,2) DEFAULT 0,
  `loading_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `created_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_assign_vehicle` (`vehicle_id`),
  INDEX `idx_assign_shipment` (`shipment_id`),
  CONSTRAINT `fk_assign_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assign_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assign_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== AUDIT LOG ======================
-- Kim ne zaman hangi tabloda hangi alanı değiştirdi
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `username` VARCHAR(100),
  `action` ENUM('create','update','delete','login','logout','upload','download') NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT,
  `entity_label` VARCHAR(200),
  `changes` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_entity` (`entity_type`,`entity_id`),
  INDEX `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== NOTIFICATIONS ======================
-- Kullanıcı başına in-app bildirim. Trigger'lar:
--   - Sevkiyat statü değişimi (atanan kullanıcıya)
--   - Yeni atama (atama yapanın aksi tarafa)
--   - Transit evrak süresi yakında (4 gün kala)
--   - Eksik belge uyarısı
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT,
  `link` VARCHAR(255),
  `entity_type` VARCHAR(50),
  `entity_id` INT,
  `read_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_user_read` (`user_id`, `read_at`),
  INDEX `idx_notif_created` (`created_at`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================== LOGIN ATTEMPTS ======================
-- Rate-limiting için login deneme kayıtları
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100),
  `ip_address` VARCHAR(45) NOT NULL,
  `success` TINYINT(1) DEFAULT 0,
  `attempted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_login_ip` (`ip_address`,`attempted_at`),
  INDEX `idx_login_user` (`username`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
