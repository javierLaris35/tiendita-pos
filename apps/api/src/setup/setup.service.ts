import { ConflictException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { SetupDto } from './dto/setup.dto'

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async status(): Promise<{ complete: boolean }> {
    const s = await this.prisma.storeSettings.findFirst({ where: { setupComplete: true } })
    return { complete: Boolean(s) }
  }

  /** Primer arranque: guarda la configuración y crea al admin. Un solo uso. */
  async run(dto: SetupDto): Promise<{ ok: true }> {
    const existing = await this.prisma.storeSettings.findFirst({ where: { setupComplete: true } })
    if (existing) throw new ConflictException('La configuración inicial ya fue completada')

    const passwordHash = await bcrypt.hash(dto.admin.password, 10)
    await this.prisma.$transaction([
      this.prisma.storeSettings.create({
        data: {
          businessName: dto.businessName,
          rfc: dto.rfc,
          ticketHeader: dto.ticketHeader,
          ticketFooter: dto.ticketFooter,
          defaultIvaRate: dto.defaultIvaRate ?? 0.16,
          printerType: dto.printerType,
          printerTarget: dto.printerTarget,
          setupComplete: true,
        },
      }),
      this.prisma.user.upsert({
        where: { email: dto.admin.email },
        update: {},
        create: { email: dto.admin.email, name: dto.admin.name, passwordHash, role: 'admin' },
      }),
    ])
    return { ok: true }
  }
}
