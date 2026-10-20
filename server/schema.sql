-- D-Invoice MySQL Database Schema
CREATE DATABASE IF NOT EXISTS `dinvoice_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dinvoice_db`;

CREATE TABLE IF NOT EXISTS `businesses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `logo_url` LONGTEXT,
  `email` VARCHAR(150),
  `phone` VARCHAR(50),
  `address_line1` VARCHAR(255),
  `address_line2` VARCHAR(255),
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `pincode` VARCHAR(20),
  `country` VARCHAR(100) DEFAULT 'India',
  `gstin` VARCHAR(30),
  `pan` VARCHAR(30),
  `bank_name` VARCHAR(150),
  `account_name` VARCHAR(150),
  `account_number` VARCHAR(100),
  `ifsc_code` VARCHAR(30),
  `upi_id` VARCHAR(100),
  `default_notes` TEXT,
  `default_terms` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `company_name` VARCHAR(255),
  `email` VARCHAR(150),
  `phone` VARCHAR(50),
  `address_line1` VARCHAR(255),
  `address_line2` VARCHAR(255),
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `pincode` VARCHAR(20),
  `country` VARCHAR(100) DEFAULT 'India',
  `gstin` VARCHAR(30),
  `shipping_address` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(100) NOT NULL UNIQUE,
  `business_id` INT DEFAULT 1,
  `client_id` INT,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `po_number` VARCHAR(100),
  `place_of_supply` VARCHAR(100),
  `status` ENUM('draft', 'pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  `payment_method` VARCHAR(50),
  `payment_date` DATE,
  `subtotal` DECIMAL(12,2) DEFAULT 0.00,
  `discount_type` VARCHAR(20) DEFAULT 'fixed',
  `discount_value` DECIMAL(12,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) DEFAULT 0.00,
  `tax_type` VARCHAR(20) DEFAULT 'intra',
  `cgst_amount` DECIMAL(12,2) DEFAULT 0.00,
  `sgst_amount` DECIMAL(12,2) DEFAULT 0.00,
  `igst_amount` DECIMAL(12,2) DEFAULT 0.00,
  `total_tax` DECIMAL(12,2) DEFAULT 0.00,
  `shipping_charges` DECIMAL(12,2) DEFAULT 0.00,
  `round_off` DECIMAL(12,2) DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) DEFAULT 0.00,
  `notes` TEXT,
  `terms` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `description` TEXT NOT NULL,
  `hsn_sac` VARCHAR(50),
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `unit` VARCHAR(30) DEFAULT 'Nos',
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5,2) DEFAULT 0.00,
  `tax_rate` DECIMAL(5,2) DEFAULT 18.00,
  `taxable_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `cgst_amount` DECIMAL(12,2) DEFAULT 0.00,
  `sgst_amount` DECIMAL(12,2) DEFAULT 0.00,
  `igst_amount` DECIMAL(12,2) DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT DEFAULT 0,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(100) NOT NULL UNIQUE,
  `key_value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
