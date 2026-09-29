-- CreateEnum
CREATE TYPE "PanelNoteStatus" AS ENUM ('CONCLUIDO', 'EM_DIA', 'ATRASO_OPERACIONAL', 'ATRASO_CONTRATUAL', 'A_FAZER');

-- CreateTable
CREATE TABLE "PanelNote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ruleText" TEXT,
    "dateText" TEXT,
    "statusText" TEXT,
    "status" "PanelNoteStatus" NOT NULL DEFAULT 'EM_DIA',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PanelNote" ADD CONSTRAINT "PanelNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
