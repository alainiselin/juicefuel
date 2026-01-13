-- AlterTable
ALTER TABLE "recipe_library" ADD COLUMN     "created_by_user_id" UUID,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "recipe_library_is_public_idx" ON "recipe_library"("is_public");

-- AddForeignKey
ALTER TABLE "recipe_library" ADD CONSTRAINT "recipe_library_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
