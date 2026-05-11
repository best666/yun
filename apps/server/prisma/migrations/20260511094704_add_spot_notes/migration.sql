-- CreateTable
CREATE TABLE `spot_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `user_name` VARCHAR(50) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `title` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `cover` VARCHAR(500) NULL,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spot_notes_spot_id_created_at_idx`(`spot_id`, `created_at`),
    INDEX `spot_notes_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `spot_notes` ADD CONSTRAINT `spot_notes_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_notes` ADD CONSTRAINT `spot_notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
