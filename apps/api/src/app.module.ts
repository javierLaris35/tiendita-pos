import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health/health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { UsersController } from './users/users.controller'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [HealthController, UsersController],
})
export class AppModule {}
