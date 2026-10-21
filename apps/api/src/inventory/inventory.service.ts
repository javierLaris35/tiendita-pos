import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InventoryMovement, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AdjustDto, ReceiptDto, WasteDto } from './dto/inventory.dto'

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async productOr404(tx: Prisma.TransactionClient, barcode: string) {
    const p = await tx.product.findUnique({ where: { barcode } })
    if (!p) throw new NotFoundException(`No existe producto con código ${barcode}`)
    return p
  }

  /** Recepción: aumenta stock y (opcional) actualiza el costo. */
  receipt(userId: number, dto: ReceiptDto): Promise<InventoryMovement> {
    return this.prisma.$transaction(async (tx) => {
      const p = await this.productOr404(tx, dto.barcode)
      const data: Prisma.ProductUpdateInput = { stock: { increment: dto.quantity } }
      if (dto.unitCost != null) data.cost = dto.unitCost
      const updated = await tx.product.update({ where: { id: p.id }, data })
      return tx.inventoryMovement.create({
        data: { productId: p.id, reason: 'receipt', quantity: dto.quantity, stockAfter: updated.stock, userId },
      })
    })
  }

  /** Merma: baja stock con decremento atómico (409 si excede). */
  waste(userId: number, dto: WasteDto): Promise<InventoryMovement> {
    return this.prisma.$transaction(async (tx) => {
      const p = await this.productOr404(tx, dto.barcode)
      const dec = await tx.product.updateMany({
        where: { id: p.id, stock: { gte: dto.quantity } },
        data: { stock: { decrement: dto.quantity } },
      })
      if (dec.count !== 1) throw new ConflictException(`Stock insuficiente de ${p.name}`)
      const after = await tx.product.findUniqueOrThrow({ where: { id: p.id } })
      return tx.inventoryMovement.create({
        data: { productId: p.id, reason: 'waste', quantity: -dto.quantity, stockAfter: after.stock, userId, note: dto.note },
      })
    })
  }

  /** Ajuste: deja el stock en el valor indicado y registra el delta con signo. */
  adjust(userId: number, dto: AdjustDto): Promise<InventoryMovement> {
    return this.prisma.$transaction(async (tx) => {
      const p = await this.productOr404(tx, dto.barcode)
      const delta = dto.newStock - Number(p.stock)
      const updated = await tx.product.update({ where: { id: p.id }, data: { stock: dto.newStock } })
      return tx.inventoryMovement.create({
        data: { productId: p.id, reason: 'adjustment', quantity: delta, stockAfter: updated.stock, userId, note: dto.note },
      })
    })
  }

  async history(barcode: string): Promise<InventoryMovement[]> {
    const p = await this.prisma.product.findUnique({ where: { barcode } })
    if (!p) throw new NotFoundException(`No existe producto con código ${barcode}`)
    return this.prisma.inventoryMovement.findMany({ where: { productId: p.id }, orderBy: { createdAt: 'desc' } })
  }
}
