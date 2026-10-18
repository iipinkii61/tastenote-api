import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EntriesService } from './entries.service';
import {
  CreateEntryDto,
  ListEntriesDto,
  UpdateEntryDto,
} from './dto/entry.dto';

@ApiTags('entries')
@Controller('entries')
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}
  @Get()
  @ApiOperation({ summary: 'List entries with search, filters and pagination' })
  findAll(@Query() query: ListEntriesDto) {
    return this.entries.findAll(query);
  }
  @Get('summary')
  @ApiOperation({
    summary: 'Journal totals, visited restaurants and favorites',
  })
  summary() {
    return this.entries.summary();
  }
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.entries.findOne(id);
  }
  @Post()
  create(@Body() body: CreateEntryDto) {
    return this.entries.create(body);
  }
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateEntryDto,
  ) {
    return this.entries.update(id, body);
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.entries.remove(id);
  }
}
