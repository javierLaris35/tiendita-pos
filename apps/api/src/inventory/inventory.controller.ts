import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AdjustDto, ReceiptDto, WasteDto } from './dto/inventory.dto'
import { InventoryService } from './inventory.service'

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  private userId(req: Request): number {
    return (req.user as { userId: number }).userId
  }

  @Post('receipt')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  receipt(@Body() dto: ReceiptDto, @Req() req: Request) {
    return this.inventory.receipt(this.userId(req), dto)
  }

  @Post('waste')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  waste(@Body() dto: WasteDto, @Req() req: Request) {
    return this.inventory.waste(this.userId(req), dto)
  }

  @Post('adjust')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  adjust(@Body() dto: AdjustDto, @Req() req: Request) {
    return this.inventory.adjust(this.userId(req), dto)
  }

  @Get(':barcode/movements')
  history(@Param('barcode') barcode: string) {
    return this.inventory.history(barcode)
  }
}
