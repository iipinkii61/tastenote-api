import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/date-only.validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreateEntryDto {
  @ApiProperty({ example: 'บ้านพาสต้า', maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  restaurant: string;

  @ApiPropertyOptional({ example: 'อารีย์, กรุงเทพฯ', default: '' })
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ example: 'Truffle cream pasta' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  menu: string;

  @ApiProperty({
    example: 'อาหารฝรั่ง',
    description: 'Category name from GET /categories',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category: string;

  @ApiProperty({ example: '2026-10-04', format: 'date' })
  @IsDateOnly()
  date: string;

  @ApiProperty({ example: 320, minimum: 0, maximum: 99999999.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'กลิ่นทรัฟเฟิลชัดมาก',
    maxLength: 500,
    default: '',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ default: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  favorite?: boolean;
}
export class UpdateEntryDto extends PartialType(CreateEntryDto, {
  skipNullProperties: false,
}) {}

export enum EntrySort {
  Date = 'date',
  Rating = 'rating',
}
export class ListEntriesDto {
  @ApiPropertyOptional({ example: 'พาสต้า' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ example: 'อาหารไทย' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  favorite?: boolean;

  @ApiPropertyOptional({ enum: EntrySort, default: EntrySort.Date })
  @IsEnum(EntrySort)
  sort: EntrySort = EntrySort.Date;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
