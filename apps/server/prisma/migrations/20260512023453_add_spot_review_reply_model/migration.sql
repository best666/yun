-- CreateTable
CREATE TABLE `spot_review_replies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `review_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `user_name` VARCHAR(50) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spot_review_replies_review_id_created_at_idx`(`review_id`, `created_at`),
    INDEX `spot_review_replies_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `spot_review_replies` ADD CONSTRAINT `spot_review_replies_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `spot_reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_review_replies` ADD CONSTRAINT `spot_review_replies_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
