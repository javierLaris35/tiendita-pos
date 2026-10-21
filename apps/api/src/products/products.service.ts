import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, Product } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto } from './dto/create-product.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    try {
      return await this.prisma.product.create({ data: dto })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Ya existe un producto con el código ${dto.barcode}`)
      }
      throw e
    }
  }

  findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } })
  }

  findByBarcode(barcode: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { barcode } })
  }
}
