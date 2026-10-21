import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CashService } from './cash.service'
import { MovementDto, OpenDto } from './dto/cash.dto'

@Controller('cash-sessions')
@UseGuards(JwtAuthGuard)
export class CashController {
  constructor(private readonly cash: CashService) {}

  private uid(req: Request): number {
    return (req.user as { userId: number }).userId
  }

  @Post('open')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  open(@Body() dto: OpenDto, @Req() req: Request) {
    return this.cash.open(this.uid(req), dto)
  }

  @Post(':id/movement')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  movement(@Param('id', ParseIntPipe) id: number, @Body() dto: MovementDto, @Req() req: Request) {
    return this.cash.movement(this.uid(req), id, dto)
  }

  @Get(':id/cut')
  cutX(@Param('id', ParseIntPipe) id: number) {
    return this.cash.cutX(id)
  }
}
