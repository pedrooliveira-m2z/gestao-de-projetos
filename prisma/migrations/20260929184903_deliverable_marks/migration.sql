-- CreateTable
CREATE TABLE "DeliverableMark" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "colorHex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableMark_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeliverableMark" ADD CONSTRAINT "DeliverableMark_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
