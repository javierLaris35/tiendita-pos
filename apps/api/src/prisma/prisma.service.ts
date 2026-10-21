import { Injectable, OnModuleInit, Optional } from '@nestjs/common'
import { Prisma, PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Optional() options?: Prisma.PrismaClientOptions) {
    super(options)
  }

  async onModuleInit() {
    await this.$connect()
  }
}
