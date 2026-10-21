-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('pz', 'kg');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "unit" "ProductUnit" NOT NULL DEFAULT 'pz',
    "price" DECIMAL(12,2) NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "ivaRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "iepsRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "image" TEXT,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
