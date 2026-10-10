-- CreateTable
CREATE TABLE "WrappedView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wrappedId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WrappedView_wrappedId_fkey" FOREIGN KEY ("wrappedId") REFERENCES "Wrapped" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WrappedView_wrappedId_userId_key" ON "WrappedView"("wrappedId", "userId");
