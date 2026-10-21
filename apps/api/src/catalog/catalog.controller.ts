import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CatalogService } from './catalog.service'

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get(':barcode')
  lookup(@Param('barcode') barcode: string) {
    return this.catalog.lookup(barcode)
  }
}
