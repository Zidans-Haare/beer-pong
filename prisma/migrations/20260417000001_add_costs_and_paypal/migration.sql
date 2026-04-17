-- Add price to BringItem
ALTER TABLE "BringItem" ADD COLUMN "price" REAL;

-- Add cost tracking to Tournament
ALTER TABLE "Tournament" ADD COLUMN "usePaypal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN "costPerPerson" REAL;

-- Add PayPal Me URL to User
ALTER TABLE "User" ADD COLUMN "paypalMeUrl" TEXT;
