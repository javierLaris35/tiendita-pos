import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_PIPE } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { CashModule } from './cash/cash.module'
import { CatalogModule } from './catalog/catalog.module'
import { HealthController } from './health/health.controller'
import { InventoryModule } from './inventory/inventory.module'
import { PrintingModule } from './printing/printing.module'
import { PrismaModule } from './prisma/prisma.module'
import { ProductsModule } from './products/products.module'
import { SalesModule } from './sales/sales.module'
import { SetupModule } from './setup/setup.module'
import { UsersController } from './users/users.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CatalogModule,
    SalesModule,
    InventoryModule,
    CashModule,
    PrintingModule,
    SetupModule,
  ],
  controllers: [HealthController, UsersController],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) },
  ],
})
export class AppModule {}
