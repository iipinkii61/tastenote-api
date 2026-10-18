import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Prisma } from '../src/generated/prisma/client';
import { setupApp } from '../src/config/setup-app';

const id = '00000000-0000-4000-8000-000000000001';
const category = {
  id: 'western',
  name: 'อาหารฝรั่ง',
  emoji: '🍝',
  color: 'peach',
  sortOrder: 2,
};
const row = {
  id,
  restaurantId: id,
  categoryId: category.id,
  restaurant: { id, name: 'บ้านพาสต้า', location: 'อารีย์, กรุงเทพฯ' },
  category,
  menu: 'Truffle cream pasta',
  date: new Date('2026-10-04T00:00:00Z'),
  price: new Prisma.Decimal('320.50'),
  rating: 5,
  note: 'อร่อย',
  favorite: true,
};
const payload = {
  restaurant: 'บ้านพาสต้า',
  menu: 'Truffle cream pasta',
  category: 'อาหารฝรั่ง',
  date: '2026-10-04',
  price: 320.5,
  rating: 5,
};
const prisma = {
  entry: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  restaurant: { count: jest.fn() },
  category: { findUnique: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
  $queryRaw: jest.fn(),
};
describe('TasteNote HTTP API (mocked database)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    setupApp(app, ['http://localhost:3000']);
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.entry.findMany.mockResolvedValue([row]);
    prisma.entry.findUnique.mockResolvedValue(row);
    prisma.entry.count.mockResolvedValue(1);
    prisma.entry.create.mockResolvedValue(row);
    prisma.entry.update.mockResolvedValue({ ...row, favorite: false });
    prisma.entry.delete.mockResolvedValue(row);
    prisma.restaurant.count.mockResolvedValue(1);
    prisma.category.findUnique.mockResolvedValue(category);
    prisma.category.findMany.mockResolvedValue([category]);
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('returns frontend-compatible entries with number prices and date-only strings', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/entries')
      .expect(200);
    expect(response.body.data[0]).toMatchObject({
      id,
      price: 320.5,
      date: '2026-10-04',
      restaurant: 'บ้านพาสต้า',
      category: 'อาหารฝรั่ง',
      emoji: '🍝',
      color: 'peach',
    });
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });
  it('preserves favorite=false and applies search, sort and pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/entries')
      .query({
        favorite: 'false',
        search: 'pasta',
        category: 'อาหารฝรั่ง',
        sort: 'rating',
        page: 2,
        limit: 10,
      })
      .expect(200);
    expect(prisma.entry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          favorite: false,
          category: { name: 'อาหารฝรั่ง' },
          OR: expect.any(Array),
        }),
        skip: 10,
        take: 10,
        orderBy: [{ rating: 'desc' }, { date: 'desc' }, { id: 'desc' }],
      }),
    );
  });
  it.each([
    { favorite: '0' },
    { page: 0 },
    { limit: 101 },
    { sort: 'invalid' },
  ])('rejects invalid query %j', async (query) => {
    await request(app.getHttpServer())
      .get('/api/v1/entries')
      .query(query)
      .expect(400);
    expect(prisma.entry.findMany).not.toHaveBeenCalled();
  });
  it('creates a meal and reuses restaurants through a compound unique key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/entries')
      .send({ ...payload, restaurant: ' บ้านพาสต้า ' })
      .expect(201);
    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          restaurant: {
            connectOrCreate: {
              where: { name_location: { name: 'บ้านพาสต้า', location: '' } },
              create: { name: 'บ้านพาสต้า', location: '' },
            },
          },
          note: '',
          favorite: false,
        }),
      }),
    );
  });
  it.each([
    { date: '2026-02-30' },
    { date: '2026-10-04T10:00:00Z' },
    { date: '0000-01-01' },
    { price: -1 },
    { price: 0.001 },
    { price: '320' },
    { rating: 6 },
    { rating: 1.5 },
    { restaurant: '  ' },
    { favorite: null },
    { note: 'x'.repeat(501) },
    { extra: 'field' },
  ])('rejects invalid create payload %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/api/v1/entries')
      .send({ ...payload, ...invalid })
      .expect(400);
    expect(prisma.entry.create).not.toHaveBeenCalled();
  });
  it('rejects unknown categories before writing', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/v1/entries')
      .send(payload)
      .expect(400);
    expect(prisma.entry.create).not.toHaveBeenCalled();
  });
  it('patches favorite=false without changing the restaurant', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/entries/${id}`)
      .send({ favorite: false })
      .expect(200);
    expect(response.body.favorite).toBe(false);
    const data = prisma.entry.update.mock.calls[0][0].data;
    expect(data.favorite).toBe(false);
    expect(data).not.toHaveProperty('restaurant');
  });
  it.each([
    { menu: null },
    { favorite: null },
    { price: null },
    { date: '2026-02-30' },
  ])('rejects invalid patch %j', async (invalid) => {
    await request(app.getHttpServer())
      .patch(`/api/v1/entries/${id}`)
      .send(invalid)
      .expect(400);
    expect(prisma.entry.update).not.toHaveBeenCalled();
  });
  it('changes a restaurant by connecting the entry to another record instead of changing other visits', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/entries/${id}`)
      .send({ restaurant: 'ร้านใหม่' })
      .expect(200);
    expect(prisma.entry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          restaurant: {
            connectOrCreate: {
              where: {
                name_location: {
                  name: 'ร้านใหม่',
                  location: 'อารีย์, กรุงเทพฯ',
                },
              },
              create: { name: 'ร้านใหม่', location: 'อารีย์, กรุงเทพฯ' },
            },
          },
        }),
      }),
    );
  });
  it('returns 404 for missing entries and 400 for malformed IDs', async () => {
    prisma.entry.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer()).get(`/api/v1/entries/${id}`).expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/entries/not-a-uuid')
      .expect(400);
  });
  it('deletes with 204 and maps a missing database record to 404', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/entries/${id}`)
      .expect(204);
    prisma.entry.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Missing', {
        code: 'P2025',
        clientVersion: '7',
      }),
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/entries/${id}`)
      .expect(404);
  });
  it('counts visited restaurants using distinct restaurant IDs', async () => {
    prisma.entry.count.mockResolvedValueOnce(6).mockResolvedValueOnce(3);
    prisma.restaurant.count.mockResolvedValue(2);
    const response = await request(app.getHttpServer())
      .get('/api/v1/entries/summary')
      .expect(200);
    expect(response.body).toEqual({
      totalEntries: 6,
      visitedRestaurants: 2,
      favorites: 3,
    });
  });
  it('returns category metadata', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);
    expect(response.body).toEqual([category]);
  });
  it('checks database readiness and reports unavailable databases', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    prisma.$queryRaw.mockRejectedValue(new Error('connection unavailable'));
    await request(app.getHttpServer()).get('/api/v1/health').expect(503);
  });
  it('enables CORS for the configured frontend', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/entries')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });
});
