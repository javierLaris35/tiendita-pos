import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Product, Sale } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSaleDto } from './dto/create-sale.dto'
import { computeLine, computeTotals, pickUnitPrice, round2 } from './sale-math'

interface Line {
  product: Product
  quantity: number
  unitPrice: number
  usedWholesale: boolean
  unitCost: number
  ivaRate: number
  iepsRate: number
  lineTotal: number
  lineTax: number
  lineProfit: number
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cashierId: number, dto: CreateSaleDto): Promise<Sale> {
    return this.prisma.$transaction(async (tx) => {
      const lines: Line[] = []

      for (const it of dto.items) {
        const product = await tx.product.findUnique({ where: { barcode: it.barcode } })
        if (!product) throw new NotFoundException(`No existe producto con código ${it.barcode}`)
        const { unitPrice, usedWholesale } = pickUnitPrice(
          {
            price: Number(product.price),
            wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : null,
            wholesaleMinQty: product.wholesaleMinQty != null ? Number(product.wholesaleMinQty) : null,
          },
          it.quantity,
        )
        const ivaRate = Number(product.ivaRate)
        const iepsRate = Number(product.iepsRate)
        const unitCost = Number(product.cost)
        const r = computeLine({ quantity: it.quantity, unitPrice, unitCost, ivaRate, iepsRate })
        lines.push({ product, quantity: it.quantity, unitPrice, usedWholesale, unitCost, ivaRate, iepsRate, ...r })
      }

      // Acumula lo pedido por producto (cubre líneas duplicadas del mismo producto en el ticket).
      const neededByProduct = new Map<number, { needed: number; product: Product }>()
      for (const l of lines) {
        const cur = neededByProduct.get(l.product.id)
        neededByProduct.set(l.product.id, { needed: (cur?.needed ?? 0) + l.quantity, product: l.product })
      }
      for (const { needed, product } of neededByProduct.values()) {
        if (needed > Number(product.stock)) {
          throw new ConflictException(`Stock insuficiente de ${product.name} (${product.stock} disponibles)`)
        }
      }

      const totals = computeTotals(lines)
      const paid = round2(dto.payments.reduce((s, p) => s + p.amount, 0))
      if (Math.abs(paid - totals.total) > 0.01) {
        throw new BadRequestException(`Los pagos (${paid}) no cuadran con el total (${totals.total})`)
      }

      // Decremento atómico condicional: cierra la ventana de carrera (multicaja a futuro).
      for (const { needed, product } of neededByProduct.values()) {
        const updated = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: needed } },
          data: { stock: { decrement: needed } },
        })
        if (updated.count !== 1) {
          throw new ConflictException(`Stock insuficiente de ${product.name}`)
        }
      }

      return tx.sale.create({
        data: {
          cashierId,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          profitTotal: totals.profitTotal,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              barcode: l.product.barcode,
              name: l.product.name,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              ivaRate: l.ivaRate,
              iepsRate: l.iepsRate,
              lineTotal: l.lineTotal,
              lineTax: l.lineTax,
              lineProfit: l.lineProfit,
              usedWholesale: l.usedWholesale,
            })),
          },
          payments: { create: dto.payments.map((p) => ({ method: p.method, amount: p.amount })) },
        },
        include: { items: true, payments: true },
      })
    })
  }

  async findOne(id: number): Promise<Sale> {
    const sale = await this.prisma.sale.findUnique({ where: { id }, include: { items: true, payments: true } })
    if (!sale) throw new NotFoundException(`No existe la venta ${id}`)
    return sale
  }

  /** Devuelve/cancela un ticket completo: reingresa stock, revierte el impuesto
   * con la línea, y lo marca como devuelto. Bloquea la doble devolución. */
  async returnSale(id: number): Promise<Sale> {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } })
      if (!sale) throw new NotFoundException(`No existe la venta ${id}`)

      // Transición de estado atómica: de dos devoluciones concurrentes, solo una afecta la fila.
      const marked = await tx.sale.updateMany({ where: { id, status: 'completed' }, data: { status: 'returned' } })
      if (marked.count !== 1) throw new ConflictException(`La venta ${id} ya fue devuelta`)

      for (const item of sale.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
        await tx.saleItem.update({ where: { id: item.id }, data: { returnedQty: item.quantity } })
      }

      return tx.sale.findUniqueOrThrow({
        where: { id },
        include: { items: true, payments: true },
      })
    })
  }
}
