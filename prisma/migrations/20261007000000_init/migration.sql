-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "location" VARCHAR(200) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,
    "color" VARCHAR(24) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" UUID NOT NULL,
    "restaurantId" UUID NOT NULL,
    "categoryId" VARCHAR(40) NOT NULL,
    "menu" VARCHAR(150) NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "rating" SMALLINT NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_name_location_key" ON "Restaurant"("name", "location");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Entry_date_id_idx" ON "Entry"("date", "id");

-- CreateIndex
CREATE INDEX "Entry_favorite_date_idx" ON "Entry"("favorite", "date");

-- CreateIndex
CREATE INDEX "Entry_categoryId_date_idx" ON "Entry"("categoryId", "date");

-- CreateIndex
CREATE INDEX "Entry_restaurantId_idx" ON "Entry"("restaurantId");

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain rules supplement the Prisma schema's types.
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_price_check" CHECK ("price" >= 0);
