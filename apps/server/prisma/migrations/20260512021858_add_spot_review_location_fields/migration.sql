-- AlterTable
ALTER TABLE `spot_reviews` ADD COLUMN `location_address` VARCHAR(300) NULL,
    ADD COLUMN `location_name` VARCHAR(100) NULL;
