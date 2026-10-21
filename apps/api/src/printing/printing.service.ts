import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { buildCorteTicket, buildSaleTicket, OPEN_DRAWER } from './escpos'
import { PRINTER_TRANSPORT, PrinterTransport } from './printer-transport'

@Injectable()
export class PrinterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PRINTER_TRANSPORT) private readonly transport: PrinterTransport,
  ) {}

  private async store(): Promise<{ businessName: string; ticketFooter?: string }> {
    const s = await this.prisma.storeSettings.findFirst({ orderBy: { id: 'desc' } })
    return {
      businessName: s?.businessName ?? this.config.get<string>('BUSINESS_NAME') ?? 'Mi Tiendita',
      ticketFooter: s?.ticketFooter ?? this.config.get<string>('TICKET_FOOTER') ?? undefined,
    }
  }

  private codepage(): number | undefined {
    const n = Number(this.config.get('PRINTER_CODEPAGE'))
    return Number.isInteger(n) ? n : undefined
  }

  async printSale(saleId: number): Promise<void> {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true, payments: true },
    })
    if (!sale) throw new NotFoundException(`No existe la venta ${saleId}`)

    const store = await this.store()
    const buf = buildSaleTicket({
      businessName: store.businessName,
      footer: store.ticketFooter,
      items: sale.items.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        lineTotal: Number(i.lineTotal),
      })),
      total: Number(sale.total),
      taxTotal: Number(sale.taxTotal),
      change: Number(sale.change),
      payments: sale.payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
      codepage: this.codepage(),
    })
    await this.transport.send(buf)
  }

  async printCorte(sessionId: number): Promise<void> {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } })
    if (!session) throw new NotFoundException(`No existe el turno ${sessionId}`)

    const store = await this.store()
    const buf = buildCorteTicket({
      businessName: store.businessName,
      openingAmount: Number(session.openingAmount),
      expectedCash: Number(session.expectedCash ?? 0),
      countedCash: Number(session.countedCash ?? 0),
      difference: Number(session.difference ?? 0),
      codepage: this.codepage(),
    })
    await this.transport.send(buf)
  }

  async openDrawer(): Promise<void> {
    await this.transport.send(OPEN_DRAWER)
  }
}
