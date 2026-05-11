-- AlterTable
ALTER TABLE `spot_discussions` ADD COLUMN `user_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `spot_favorites` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `spot_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `spot_favorites_spot_id_idx`(`spot_id`),
    UNIQUE INDEX `spot_favorites_user_id_spot_id_key`(`user_id`, `spot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spot_discussion_likes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `discussion_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `spot_discussion_likes_user_id_idx`(`user_id`),
    UNIQUE INDEX `spot_discussion_likes_discussion_id_user_id_key`(`discussion_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `spot_discussions_user_id_idx` ON `spot_discussions`(`user_id`);

-- AddForeignKey
ALTER TABLE `spot_discussions` ADD CONSTRAINT `spot_discussions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_favorites` ADD CONSTRAINT `spot_favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_favorites` ADD CONSTRAINT `spot_favorites_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_discussion_likes` ADD CONSTRAINT `spot_discussion_likes_discussion_id_fkey` FOREIGN KEY (`discussion_id`) REFERENCES `spot_discussions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spot_discussion_likes` ADD CONSTRAINT `spot_discussion_likes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
