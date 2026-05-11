-- CreateTable
CREATE TABLE `spots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `cover` VARCHAR(500) NULL,
    `images` TEXT NULL,
    `address` VARCHAR(300) NULL,
    `phone` VARCHAR(20) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `rating` DECIMAL(2, 1) NOT NULL DEFAULT 0,
    `avg_price` INTEGER NOT NULL DEFAULT 0,
    `favorite_count` INTEGER NOT NULL DEFAULT 0,
    `business_status` VARCHAR(30) NULL,
    `business_hours` VARCHAR(100) NULL,
    `route_tip` VARCHAR(200) NULL,
    `navigation_label` VARCHAR(200) NULL,
    `tags` VARCHAR(500) NULL,
    `source_type` VARCHAR(30) NOT NULL DEFAULT 'manual',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spots_source_type_idx`(`source_type`),
    INDEX `spots_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spot_external_sources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `external_id` VARCHAR(120) NOT NULL,
    `title` VARCHAR(100) NULL,
    `address` VARCHAR(300) NULL,
    `category` VARCHAR(200) NULL,
    `district` VARCHAR(100) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spot_external_sources_spot_id_idx`(`spot_id`),
    INDEX `spot_external_sources_external_id_idx`(`external_id`),
    UNIQUE INDEX `spot_external_sources_provider_external_id_key`(`provider`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spot_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `user_name` VARCHAR(50) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `images` TEXT NULL,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spot_reviews_spot_id_created_at_idx`(`spot_id`, `created_at`),
    INDEX `spot_reviews_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spot_discussions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `user_name` VARCHAR(50) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spot_discussions_spot_id_created_at_idx`(`spot_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `spot_external_sources` ADD CONSTRAINT `spot_external_sources_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_reviews` ADD CONSTRAINT `spot_reviews_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_reviews` ADD CONSTRAINT `spot_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_discussions` ADD CONSTRAINT `spot_discussions_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
