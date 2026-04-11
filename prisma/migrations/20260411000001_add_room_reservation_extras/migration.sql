-- AlterTable
ALTER TABLE "RoomReservation" ADD COLUMN "wantsBreakfast" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RoomReservation" ADD COLUMN "wantsHalfBoard" BOOLEAN NOT NULL DEFAULT false;
