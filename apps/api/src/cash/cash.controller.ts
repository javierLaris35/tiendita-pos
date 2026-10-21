import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { Actor, CashService } from './cash.service'
import { CloseDto, MovementDto, OpenDto } from './dto/cash.dto'

@Controller('cash-sessions')
@UseGuards(JwtAuthGuard)
export class CashController {
  constructor(private readonly cash: CashService) {}

  private actor(req: Request): Actor {
    return req.user as Actor
  }

  @Post('open')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  open(@Body() dto: OpenDto, @Req() req: Request) {
    return this.cash.open(this.actor(req).userId, dto)
  }

  @Post(':id/movement')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  movement(@Param('id', ParseIntPipe) id: number, @Body() dto: MovementDto, @Req() req: Request) {
    return this.cash.movement(this.actor(req), id, dto)
  }

  @Get(':id/cut')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  cutX(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.cash.cutX(id, this.actor(req))
  }

  @Post(':id/close')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  close(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseDto, @Req() req: Request) {
    return this.cash.close(id, dto, this.actor(req))
  }
}
