import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateProductDto } from './dto/create-product.dto'
import { ProductsService } from './products.service'

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto)
  }

  @Get()
  findAll() {
    return this.products.findAll()
  }

  @Get(':barcode')
  async findOne(@Param('barcode') barcode: string) {
    const product = await this.products.findByBarcode(barcode)
    if (!product) throw new NotFoundException(`No existe producto con código ${barcode}`)
    return product
  }
}
