-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('open', 'closed');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "cashSessionId" INTEGER;

-- CreateTable
CREATE TABLE "CashSession" (
    "id" SERIAL NOT NULL,
    "cashierId" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingAmount" DECIMAL(12,2) NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'open',
    "closedAt" TIMESTAMP(3),
    "expectedCash" DECIMAL(12,2),
    "countedCash" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
