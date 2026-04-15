-- =========================================
-- INIT DATABASE - maintenance_app
-- MariaDB Docker-ready
-- =========================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- =========================================
-- USERS
-- =========================================
CREATE TABLE `users` (
`id_user` int(11) NOT NULL AUTO_INCREMENT,
`id_client` int(11) DEFAULT NULL,
`username` varchar(100) NOT NULL,
`email` varchar(150) DEFAULT NULL,
`password_hash` varchar(255) NOT NULL,
`role` enum('admin','client','user') NOT NULL,
`is_blocked` tinyint(1) NOT NULL DEFAULT 0,
`block_reason` text DEFAULT NULL,
`last_login` datetime DEFAULT NULL,
`created_at` timestamp NULL DEFAULT current_timestamp(),
PRIMARY KEY (`id_user`),
UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users`
VALUES
(1,NULL,'admin','admin@mail.com','$2b$12$Enh9if4yN/0RvNUFup6pDeD/yCtixfU3I1ml7c8fTt.dw/ZuFIRWW','admin',0,NULL,'2026-04-13 23:09:26','2026-03-21 14:39:42');

-- =========================================
-- CLIENTS
-- =========================================
CREATE TABLE `clients` (
`id_client` int(11) NOT NULL AUTO_INCREMENT,
`nom` varchar(255) NOT NULL,
`contact` varchar(255) DEFAULT NULL,
`adresse` varchar(255) DEFAULT NULL,
`email` varchar(255) DEFAULT NULL,
`telephone` varchar(50) DEFAULT NULL,
`date_creation` timestamp NULL DEFAULT current_timestamp(),
PRIMARY KEY (`id_client`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- SITES
-- =========================================
CREATE TABLE `sites` (
`id_site` int(11) NOT NULL AUTO_INCREMENT,
`id_client` int(11) NOT NULL,
`nom` varchar(255) NOT NULL,
`adresse` varchar(255) DEFAULT NULL,
`gps_lat` decimal(10,7) DEFAULT NULL,
`gps_lng` decimal(10,7) DEFAULT NULL,
`date_creation` timestamp NULL DEFAULT current_timestamp(),
PRIMARY KEY (`id_site`),
KEY `idx_site_client` (`id_client`),
CONSTRAINT `sites_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id_client`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- PRODUITS
-- =========================================
CREATE TABLE `produits` (
`id_produit` int(11) NOT NULL AUTO_INCREMENT,
`id_site` int(11) NOT NULL,
`nom` varchar(100) NOT NULL,
`departement` varchar(50) DEFAULT NULL,
`etat` varchar(30) DEFAULT NULL,
`description` text DEFAULT NULL,
`date_creation` date NOT NULL,
PRIMARY KEY (`id_produit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- MAINTENANCES
-- =========================================
CREATE TABLE `maintenances` (
`id_maintenance` int(11) NOT NULL AUTO_INCREMENT,
`id_site` int(11) NOT NULL,
`date_maintenance` date NOT NULL,
`type` varchar(500) DEFAULT NULL,
`types_intervention` text DEFAULT NULL,
`etat` varchar(30) DEFAULT NULL,
`commentaire` text DEFAULT NULL,
`date_creation` date DEFAULT NULL,
`operateurs` text DEFAULT NULL,
`heure_arrivee_matin` time DEFAULT NULL,
`heure_depart_matin` time DEFAULT NULL,
`heure_arrivee_aprem` time DEFAULT NULL,
`heure_depart_aprem` time DEFAULT NULL,
`jours_intervention` longtext DEFAULT NULL,
`garantie` tinyint(1) DEFAULT 0,
`commentaire_interne` text DEFAULT NULL,
`contact` varchar(255) DEFAULT NULL,
`type_produit` varchar(255) DEFAULT NULL,
`numero_commande` varchar(100) DEFAULT NULL,
`numero_ri` varchar(50) DEFAULT NULL,
`designation_produit_site` varchar(255) DEFAULT NULL,
`date_demande` date DEFAULT NULL,
`date_accord_client` date DEFAULT NULL,
`departement` varchar(10) DEFAULT NULL,
PRIMARY KEY (`id_maintenance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- JOIN TABLE: maintenance_produits
-- =========================================
CREATE TABLE `maintenance_produits` (
`id_maintenance` int(11) NOT NULL,
`id_produit` int(11) NOT NULL,
`etat` varchar(50) DEFAULT 'N/A',
`commentaire` text DEFAULT NULL,
`etat_constate` text DEFAULT NULL,
`travaux_effectues` text DEFAULT NULL,
`ri_interne` text DEFAULT NULL,
`photo` varchar(255) DEFAULT NULL,
PRIMARY KEY (`id_maintenance`,`id_produit`),
KEY `id_produit` (`id_produit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- IMAGES
-- =========================================
CREATE TABLE `images` (
`id_image` int(11) NOT NULL AUTO_INCREMENT,
`id_maintenance` int(11) NOT NULL,
`path` varchar(255) NOT NULL,
`ordre` int(11) DEFAULT 1,
`date_creation` timestamp NULL DEFAULT current_timestamp(),
PRIMARY KEY (`id_image`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- PRODUIT PHOTOS
-- =========================================
CREATE TABLE `produit_photos` (
`id_photo` int(11) NOT NULL AUTO_INCREMENT,
`id_produit` int(11) NOT NULL,
`id_maintenance` int(11) DEFAULT NULL,
`chemin_photo` varchar(500) NOT NULL,
`date_creation` timestamp NULL DEFAULT current_timestamp(),
`commentaire` text DEFAULT NULL,
PRIMARY KEY (`id_photo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- QR CODES
-- =========================================
CREATE TABLE `qr_codes` (
`id_qr` int(11) NOT NULL AUTO_INCREMENT,
`id_produit` int(11) NOT NULL,
`etat` varchar(30) NOT NULL,
PRIMARY KEY (`id_qr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- ACTIVITY LOGS (CLEANED)
-- =========================================
CREATE TABLE `activity_logs` (
`id` int(11) NOT NULL AUTO_INCREMENT,
`id_user` int(11) DEFAULT NULL,
`username` varchar(100) DEFAULT NULL,
`action` varchar(50) DEFAULT NULL,
`table_name` varchar(100) DEFAULT NULL,
`detail` text DEFAULT NULL,
`ip_address` varchar(45) DEFAULT NULL,
`created_at` datetime DEFAULT current_timestamp(),
PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


