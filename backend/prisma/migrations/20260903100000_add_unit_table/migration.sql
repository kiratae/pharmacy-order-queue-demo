-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- Seed Unit rows from every distinct unitId already referenced by Order,
-- so the FK constraint added below doesn't orphan existing rows.
INSERT INTO "Unit" ("id", "name")
SELECT DISTINCT "unitId", "unitId" FROM "Order"
ON CONFLICT ("id") DO NOTHING;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
