-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "active_household_id" UUID;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_active_household_id_fkey" FOREIGN KEY ("active_household_id") REFERENCES "household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
