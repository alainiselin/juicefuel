-- CreateEnum
CREATE TYPE "IngredientSource" AS ENUM ('OFF', 'USER');

-- DropForeignKey
ALTER TABLE "shopping_list_item" DROP CONSTRAINT "shopping_list_item_ingredient_id_fkey";

-- AlterTable
ALTER TABLE "ingredient" ADD COLUMN     "aisle" TEXT,
ADD COLUMN     "household_id" UUID,
ADD COLUMN     "is_core" BOOLEAN DEFAULT true,
ADD COLUMN     "is_recipe_eligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "source" "IngredientSource" DEFAULT 'OFF';

-- AlterTable
ALTER TABLE "recipe" ADD COLUMN     "base_servings" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "description" VARCHAR(240),
ADD COLUMN     "prep_time_minutes" INTEGER;

-- AlterTable
ALTER TABLE "recipe_ingredient" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "shopping_list_item" ADD COLUMN     "article_id" UUID,
ADD COLUMN     "note" TEXT,
ALTER COLUMN "ingredient_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tag" ADD COLUMN     "household_id" UUID,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "scope" TEXT DEFAULT 'GLOBAL';

-- CreateTable
CREATE TABLE "recipe_favorite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_alias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ingredient_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_article" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "default_unit" "Unit",
    "default_aisle" TEXT NOT NULL DEFAULT 'own-items',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shopping_article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_tag" (
    "ingredient_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "ingredient_tag_pkey" PRIMARY KEY ("ingredient_id","tag_id")
);

-- CreateTable
CREATE TABLE "shopping_list_item_tag" (
    "shopping_list_item_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "shopping_list_item_tag_pkey" PRIMARY KEY ("shopping_list_item_id","tag_id")
);

-- CreateIndex
CREATE INDEX "recipe_favorite_user_id_idx" ON "recipe_favorite"("user_id");

-- CreateIndex
CREATE INDEX "recipe_favorite_recipe_id_idx" ON "recipe_favorite"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_favorite_user_id_recipe_id_key" ON "recipe_favorite"("user_id", "recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_alias_name_key" ON "ingredient_alias"("name");

-- CreateIndex
CREATE INDEX "ingredient_alias_name_idx" ON "ingredient_alias"("name");

-- CreateIndex
CREATE INDEX "ingredient_alias_ingredient_id_idx" ON "ingredient_alias"("ingredient_id");

-- CreateIndex
CREATE INDEX "shopping_article_household_id_idx" ON "shopping_article"("household_id");

-- CreateIndex
CREATE INDEX "shopping_article_normalized_name_idx" ON "shopping_article"("normalized_name");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_article_household_id_normalized_name_key" ON "shopping_article"("household_id", "normalized_name");

-- CreateIndex
CREATE INDEX "ingredient_tag_tag_id_idx" ON "ingredient_tag"("tag_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_tag_tag_id_idx" ON "shopping_list_item_tag"("tag_id");

-- CreateIndex
CREATE INDEX "ingredient_is_core_idx" ON "ingredient"("is_core");

-- CreateIndex
CREATE INDEX "ingredient_household_id_idx" ON "ingredient"("household_id");

-- CreateIndex
CREATE INDEX "ingredient_is_recipe_eligible_idx" ON "ingredient"("is_recipe_eligible");

-- CreateIndex
CREATE INDEX "ingredient_aisle_idx" ON "ingredient"("aisle");

-- CreateIndex
CREATE INDEX "ingredient_name_idx" ON "ingredient"("name");

-- CreateIndex
CREATE INDEX "shopping_list_item_article_id_idx" ON "shopping_list_item"("article_id");

-- CreateIndex
CREATE INDEX "tag_household_id_idx" ON "tag"("household_id");

-- CreateIndex
CREATE INDEX "tag_kind_idx" ON "tag"("kind");

-- CreateIndex
CREATE INDEX "tag_scope_idx" ON "tag"("scope");

-- AddForeignKey
ALTER TABLE "recipe_favorite" ADD CONSTRAINT "recipe_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorite" ADD CONSTRAINT "recipe_favorite_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_alias" ADD CONSTRAINT "ingredient_alias_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredient"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tag" ADD CONSTRAINT "tag_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shopping_article" ADD CONSTRAINT "shopping_article_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "shopping_article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_tag" ADD CONSTRAINT "ingredient_tag_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredient"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ingredient_tag" ADD CONSTRAINT "ingredient_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shopping_list_item_tag" ADD CONSTRAINT "shopping_list_item_tag_shopping_list_item_id_fkey" FOREIGN KEY ("shopping_list_item_id") REFERENCES "shopping_list_item"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shopping_list_item_tag" ADD CONSTRAINT "shopping_list_item_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

