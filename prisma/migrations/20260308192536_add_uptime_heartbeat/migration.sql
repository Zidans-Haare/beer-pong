-- AlterTable
ALTER TABLE "Match" ADD COLUMN "tableNumber" INTEGER;

-- CreateTable
CREATE TABLE "UptimeHeartbeat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" DATETIME NOT NULL,
    "status" INTEGER NOT NULL,
    "ping" INTEGER NOT NULL DEFAULT 0,
    "msg" TEXT NOT NULL DEFAULT ''
);

-- CreateIndex
CREATE UNIQUE INDEX "UptimeHeartbeat_time_key" ON "UptimeHeartbeat"("time");
