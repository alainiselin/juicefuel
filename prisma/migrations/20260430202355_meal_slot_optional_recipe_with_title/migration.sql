-- AlterTable
ALTER TABLE "meal_slot" ALTER COLUMN "recipe_id" DROP NOT NULL,
ADD COLUMN "title" TEXT;
