-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "rfc" TEXT,
    "ticketHeader" TEXT,
    "ticketFooter" TEXT,
    "defaultIvaRate" DECIMAL(5,4) NOT NULL DEFAULT 0.16,
    "printerType" TEXT,
    "printerTarget" TEXT,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);
