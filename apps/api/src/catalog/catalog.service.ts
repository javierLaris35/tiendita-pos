import { Injectable } from '@nestjs/common'
import { CatalogItem, Product } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ProductsService } from '../products/products.service'

export type CatalogHit =
  | { source: 'product'; product: Product }
  | { source: 'catalog'; item: CatalogItem }
  | { source: 'unknown'; barcode: string }

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  /** Resuelve un código: producto propio → catálogo base → desconocido. */
  async lookup(barcode: string): Promise<CatalogHit> {
    const product = await this.products.findByBarcode(barcode)
    if (product) return { source: 'product', product }

    const item = await this.prisma.catalogItem.findUnique({ where: { code: barcode } })
    if (item) return { source: 'catalog', item }

    return { source: 'unknown', barcode }
  }
}
