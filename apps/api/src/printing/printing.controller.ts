import { Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { PrinterService } from './printing.service'

@Controller('print')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'cashier')
export class PrintingController {
  constructor(private readonly printer: PrinterService) {}

  @Post('sale/:id')
  printSale(@Param('id', ParseIntPipe) id: number) {
    return this.printer.printSale(id)
  }

  @Post('corte/:id')
  printCorte(@Param('id', ParseIntPipe) id: number) {
    return this.printer.printCorte(id)
  }

  @Post('drawer')
  openDrawer() {
    return this.printer.openDrawer()
  }
}
