import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import entries from './fixtures/entries.json';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const categories = [
  { id: 'thai', name: 'อาหารไทย', emoji: '🍜', color: 'yellow' },
  { id: 'japanese', name: 'อาหารญี่ปุ่น', emoji: '🍣', color: 'pink' },
  { id: 'western', name: 'อาหารฝรั่ง', emoji: '🍝', color: 'peach' },
  { id: 'cafe', name: 'คาเฟ่', emoji: '☕', color: 'sage' },
  { id: 'dessert', name: 'ของหวาน', emoji: '🍰', color: 'lavender' },
  { id: 'other', name: 'อื่น ๆ', emoji: '🍽️', color: 'sand' },
];
async function seed() {
  await prisma.$transaction(async (tx) => {
    for (const [sortOrder, category] of categories.entries()) {
      await tx.category.upsert({
        where: { id: category.id },
        update: { ...category, sortOrder },
        create: { ...category, sortOrder },
      });
    }
    for (const [index, entry] of entries.entries()) {
      const restaurant = await tx.restaurant.upsert({
        where: {
          name_location: { name: entry.restaurant, location: entry.location },
        },
        update: {},
        create: { name: entry.restaurant, location: entry.location },
      });
      const category = categories.find((item) => item.name === entry.category)!;
      // Stable UUIDs make reruns additive and preserve edits to seeded entries.
      const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      await tx.entry.upsert({
        where: { id },
        update: {},
        create: {
          id,
          restaurantId: restaurant.id,
          categoryId: category.id,
          menu: entry.menu,
          date: new Date(`${entry.date}T00:00:00.000Z`),
          price: entry.price,
          rating: entry.rating,
          note: entry.note,
          favorite: entry.favorite,
        },
      });
    }
  });
  console.log('Seeded 6 categories and 6 example entries');
}
void seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
