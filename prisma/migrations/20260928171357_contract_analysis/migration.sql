-- AlterTable
ALTER TABLE "Front" ADD COLUMN     "contractAnalysis" JSONB,
ADD COLUMN     "contractAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "contractFileName" TEXT,
ADD COLUMN     "contractFileUrl" TEXT,
ADD COLUMN     "contractUploadedAt" TIMESTAMP(3);
