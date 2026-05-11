-- CreateTable
CREATE TABLE `spot_interaction_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_user_id` INTEGER NOT NULL,
    `actor_user_id` INTEGER NULL,
    `spot_id` INTEGER NULL,
    `type` VARCHAR(30) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `target_type` VARCHAR(30) NULL,
    `target_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `spot_interaction_notifications_recipient_user_id_is_read_cre_idx`(`recipient_user_id`, `is_read`, `created_at`),
    INDEX `spot_interaction_notifications_actor_user_id_idx`(`actor_user_id`),
    INDEX `spot_interaction_notifications_spot_id_idx`(`spot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `spot_interaction_notifications` ADD CONSTRAINT `spot_interaction_notifications_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_interaction_notifications` ADD CONSTRAINT `spot_interaction_notifications_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_interaction_notifications` ADD CONSTRAINT `spot_interaction_notifications_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
