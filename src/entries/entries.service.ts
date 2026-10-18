import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEntryDto,
  EntrySort,
  ListEntriesDto,
  UpdateEntryDto,
} from './dto/entry.dto';

const include = { restaurant: true, category: true } as const;
type EntryWithRelations = Prisma.EntryGetPayload<{ include: typeof include }>;
export function serializeEntry(entry: EntryWithRelations) {
  return {
    id: entry.id,
    restaurant: entry.restaurant.name,
    location: entry.restaurant.location,
    menu: entry.menu,
    category: entry.category.name,
    date: entry.date.toISOString().slice(0, 10),
    price: Number(entry.price),
    rating: entry.rating,
    note: entry.note,
    favorite: entry.favorite,
    emoji: entry.category.emoji,
    color: entry.category.color,
  };
}

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(query: ListEntriesDto) {
    const where: Prisma.EntryWhereInput = {
      ...(query.favorite !== undefined && { favorite: query.favorite }),
      ...(query.category && { category: { name: query.category } }),
      ...(query.search && {
        OR: [
          { menu: { contains: query.search, mode: 'insensitive' } },
          { note: { contains: query.search, mode: 'insensitive' } },
          {
            restaurant: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
          {
            restaurant: {
              location: { contains: query.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    };
    const orderBy: Prisma.EntryOrderByWithRelationInput[] =
      query.sort === EntrySort.Rating
        ? [{ rating: 'desc' }, { date: 'desc' }, { id: 'desc' }]
        : [{ date: 'desc' }, { id: 'desc' }];
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.entry.findMany({
          where,
          include,
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.entry.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: rows.map(serializeEntry),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async findOne(id: string) {
    const entry = await this.prisma.entry.findUnique({
      where: { id },
      include,
    });
    if (!entry) throw new NotFoundException('Entry not found');
    return serializeEntry(entry);
  }
  async summary() {
    const [totalEntries, favorites, restaurants] =
      await this.prisma.$transaction(
        [
          this.prisma.entry.count(),
          this.prisma.entry.count({ where: { favorite: true } }),
          this.prisma.restaurant.count({ where: { entries: { some: {} } } }),
        ],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    return { totalEntries, visitedRestaurants: restaurants, favorites };
  }
  async create(dto: CreateEntryDto) {
    const category = await this.resolveCategory(dto.category);
    const entry = await this.prisma.entry.create({
      data: {
        menu: dto.menu,
        date: new Date(`${dto.date}T00:00:00.000Z`),
        price: dto.price,
        rating: dto.rating,
        note: dto.note ?? '',
        favorite: dto.favorite ?? false,
        category: { connect: { id: category.id } },
        restaurant: {
          connectOrCreate: {
            where: {
              name_location: {
                name: dto.restaurant,
                location: dto.location ?? '',
              },
            },
            create: { name: dto.restaurant, location: dto.location ?? '' },
          },
        },
      },
      include,
    });
    return serializeEntry(entry);
  }
  async update(id: string, dto: UpdateEntryDto) {
    const current = await this.prisma.entry.findUnique({
      where: { id },
      include,
    });
    if (!current) throw new NotFoundException('Entry not found');
    const category =
      dto.category !== undefined
        ? await this.resolveCategory(dto.category)
        : undefined;
    const restaurantChanged =
      dto.restaurant !== undefined || dto.location !== undefined;
    const name = dto.restaurant ?? current.restaurant.name;
    const location = dto.location ?? current.restaurant.location;
    const entry = await this.prisma.entry.update({
      where: { id },
      data: {
        menu: dto.menu,
        price: dto.price,
        rating: dto.rating,
        note: dto.note,
        favorite: dto.favorite,
        ...(dto.date !== undefined && {
          date: new Date(`${dto.date}T00:00:00.000Z`),
        }),
        ...(category && { category: { connect: { id: category.id } } }),
        ...(restaurantChanged && {
          restaurant: {
            connectOrCreate: {
              where: { name_location: { name, location } },
              create: { name, location },
            },
          },
        }),
      },
      include,
    });
    return serializeEntry(entry);
  }
  async remove(id: string) {
    await this.prisma.entry.delete({ where: { id } });
  }
  private async resolveCategory(name: string) {
    const category = await this.prisma.category.findUnique({ where: { name } });
    if (!category)
      throw new BadRequestException(
        'Unknown category; use GET /api/v1/categories',
      );
    return category;
  }
}
