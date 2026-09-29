-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "approvalColorHex" TEXT,
ADD COLUMN     "approvalEndOverride" TIMESTAMP(3),
ADD COLUMN     "approvalStartOverride" TIMESTAMP(3);
