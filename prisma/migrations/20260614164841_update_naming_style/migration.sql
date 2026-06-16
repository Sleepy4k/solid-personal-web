/*
  Warnings:

  - You are about to drop the `asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `education` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `educationachievement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `experience` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `experienceresponsibility` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `experiencetechnology` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `githubcache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profilelink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projectimage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projecttechnology` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technology` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `volunteering` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `volunteeringimpact` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `education` DROP FOREIGN KEY `Education_logoId_fkey`;

-- DropForeignKey
ALTER TABLE `educationachievement` DROP FOREIGN KEY `EducationAchievement_educationId_fkey`;

-- DropForeignKey
ALTER TABLE `experience` DROP FOREIGN KEY `Experience_logoId_fkey`;

-- DropForeignKey
ALTER TABLE `experienceresponsibility` DROP FOREIGN KEY `ExperienceResponsibility_experienceId_fkey`;

-- DropForeignKey
ALTER TABLE `experiencetechnology` DROP FOREIGN KEY `ExperienceTechnology_experienceId_fkey`;

-- DropForeignKey
ALTER TABLE `experiencetechnology` DROP FOREIGN KEY `ExperienceTechnology_technologyId_fkey`;

-- DropForeignKey
ALTER TABLE `profile` DROP FOREIGN KEY `Profile_avatarId_fkey`;

-- DropForeignKey
ALTER TABLE `profile` DROP FOREIGN KEY `Profile_resumeId_fkey`;

-- DropForeignKey
ALTER TABLE `profilelink` DROP FOREIGN KEY `ProfileLink_profileId_fkey`;

-- DropForeignKey
ALTER TABLE `project` DROP FOREIGN KEY `Project_coverId_fkey`;

-- DropForeignKey
ALTER TABLE `projectimage` DROP FOREIGN KEY `ProjectImage_assetId_fkey`;

-- DropForeignKey
ALTER TABLE `projectimage` DROP FOREIGN KEY `ProjectImage_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `projecttechnology` DROP FOREIGN KEY `ProjectTechnology_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `projecttechnology` DROP FOREIGN KEY `ProjectTechnology_technologyId_fkey`;

-- DropForeignKey
ALTER TABLE `session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropForeignKey
ALTER TABLE `volunteering` DROP FOREIGN KEY `Volunteering_logoId_fkey`;

-- DropForeignKey
ALTER TABLE `volunteeringimpact` DROP FOREIGN KEY `VolunteeringImpact_volunteeringId_fkey`;

-- DropTable
DROP TABLE `asset`;

-- DropTable
DROP TABLE `education`;

-- DropTable
DROP TABLE `educationachievement`;

-- DropTable
DROP TABLE `experience`;

-- DropTable
DROP TABLE `experienceresponsibility`;

-- DropTable
DROP TABLE `experiencetechnology`;

-- DropTable
DROP TABLE `githubcache`;

-- DropTable
DROP TABLE `profile`;

-- DropTable
DROP TABLE `profilelink`;

-- DropTable
DROP TABLE `project`;

-- DropTable
DROP TABLE `projectimage`;

-- DropTable
DROP TABLE `projecttechnology`;

-- DropTable
DROP TABLE `session`;

-- DropTable
DROP TABLE `technology`;

-- DropTable
DROP TABLE `user`;

-- DropTable
DROP TABLE `volunteering`;

-- DropTable
DROP TABLE `volunteeringimpact`;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_token_key`(`token`),
    INDEX `sessions_token_idx`(`token`),
    INDEX `sessions_user_id_idx`(`user_id`),
    INDEX `sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `bio` TEXT NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `avatar_id` VARCHAR(191) NULL,
    `resume_id` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_avatar_id_key`(`avatar_id`),
    UNIQUE INDEX `profiles_resume_id_key`(`resume_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_links` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,

    INDEX `profile_links_profile_id_idx`(`profile_id`),
    UNIQUE INDEX `profile_links_profile_id_platform_key`(`profile_id`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `educations` (
    `id` VARCHAR(191) NOT NULL,
    `institution` VARCHAR(191) NOT NULL,
    `degree` VARCHAR(191) NOT NULL,
    `field` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `gpa` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `logo_id` VARCHAR(191) NULL,

    INDEX `educations_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `education_achievements` (
    `id` VARCHAR(191) NOT NULL,
    `education_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `education_achievements_education_id_order_idx`(`education_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `technologies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,

    UNIQUE INDEX `technologies_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `demo_url` VARCHAR(191) NULL,
    `repo_url` VARCHAR(191) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'COMPLETED',
    `cover_id` VARCHAR(191) NULL,

    INDEX `projects_featured_order_idx`(`featured`, `order`),
    INDEX `projects_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_technologies` (
    `project_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,

    INDEX `project_technologies_technology_id_idx`(`technology_id`),
    PRIMARY KEY (`project_id`, `technology_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_images` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `project_images_project_id_order_idx`(`project_id`, `order`),
    UNIQUE INDEX `project_images_project_id_asset_id_key`(`project_id`, `asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experiences` (
    `id` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `logo_id` VARCHAR(191) NULL,

    INDEX `experiences_order_idx`(`order`),
    INDEX `experiences_current_idx`(`current`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experience_responsibilities` (
    `id` VARCHAR(191) NOT NULL,
    `experience_id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `experience_responsibilities_experience_id_order_idx`(`experience_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experience_technologies` (
    `experience_id` VARCHAR(191) NOT NULL,
    `technology_id` VARCHAR(191) NOT NULL,

    INDEX `experience_technologies_technology_id_idx`(`technology_id`),
    PRIMARY KEY (`experience_id`, `technology_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `volunteerings` (
    `id` VARCHAR(191) NOT NULL,
    `organization` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `current` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `logo_id` VARCHAR(191) NULL,

    INDEX `volunteerings_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `volunteering_impacts` (
    `id` VARCHAR(191) NOT NULL,
    `volunteering_id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `volunteering_impacts_volunteering_id_order_idx`(`volunteering_id`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `alt` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `assets_path_key`(`path`),
    INDEX `assets_mime_type_idx`(`mime_type`),
    INDEX `assets_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `github_cache` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `data` JSON NOT NULL,
    `fetched_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `github_cache_username_key`(`username`),
    INDEX `github_cache_fetched_at_idx`(`fetched_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_avatar_id_fkey` FOREIGN KEY (`avatar_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_resume_id_fkey` FOREIGN KEY (`resume_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_links` ADD CONSTRAINT `profile_links_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `educations` ADD CONSTRAINT `educations_logo_id_fkey` FOREIGN KEY (`logo_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `education_achievements` ADD CONSTRAINT `education_achievements_education_id_fkey` FOREIGN KEY (`education_id`) REFERENCES `educations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_cover_id_fkey` FOREIGN KEY (`cover_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_technologies` ADD CONSTRAINT `project_technologies_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_technologies` ADD CONSTRAINT `project_technologies_technology_id_fkey` FOREIGN KEY (`technology_id`) REFERENCES `technologies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_images` ADD CONSTRAINT `project_images_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_images` ADD CONSTRAINT `project_images_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiences` ADD CONSTRAINT `experiences_logo_id_fkey` FOREIGN KEY (`logo_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experience_responsibilities` ADD CONSTRAINT `experience_responsibilities_experience_id_fkey` FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experience_technologies` ADD CONSTRAINT `experience_technologies_experience_id_fkey` FOREIGN KEY (`experience_id`) REFERENCES `experiences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experience_technologies` ADD CONSTRAINT `experience_technologies_technology_id_fkey` FOREIGN KEY (`technology_id`) REFERENCES `technologies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteerings` ADD CONSTRAINT `volunteerings_logo_id_fkey` FOREIGN KEY (`logo_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volunteering_impacts` ADD CONSTRAINT `volunteering_impacts_volunteering_id_fkey` FOREIGN KEY (`volunteering_id`) REFERENCES `volunteerings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
