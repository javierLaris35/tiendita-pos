import { Module } from '@nestjs/common'
import { NoopPrinterTransport, PRINTER_TRANSPORT } from './printer-transport'
import { PrintingController } from './printing.controller'
import { PrinterService } from './printing.service'

@Module({
  controllers: [PrintingController],
  providers: [PrinterService, { provide: PRINTER_TRANSPORT, useClass: NoopPrinterTransport }],
})
export class PrintingModule {}
