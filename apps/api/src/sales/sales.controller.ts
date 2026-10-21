import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateSaleDto } from './dto/create-sale.dto'
import { SalesService } from './sales.service'

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  create(@Body() dto: CreateSaleDto, @Req() req: Request) {
    const user = req.user as { userId: number }
    return this.sales.create(user.userId, dto)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sales.findOne(id)
  }

  @Post(':id/return')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  returnSale(@Param('id', ParseIntPipe) id: number) {
    return this.sales.returnSale(id)
  }
}
