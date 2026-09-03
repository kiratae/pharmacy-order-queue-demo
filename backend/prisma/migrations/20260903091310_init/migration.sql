-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PARTIALLY_ACCEPTED', 'ACCEPTED', 'REJECTED', 'READY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "patientName" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Order_unitId_status_idx" ON "Order"("unitId", "status");

-- CreateIndex
CREATE INDEX "Order_updatedAt_idx" ON "Order"("updatedAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
