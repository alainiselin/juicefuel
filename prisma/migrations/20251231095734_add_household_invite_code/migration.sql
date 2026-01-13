/*
  Warnings:

  - A unique constraint covering the columns `[invite_code]` on the table `household` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "household" ADD COLUMN     "invite_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "household_invite_code_key" ON "household"("invite_code");
