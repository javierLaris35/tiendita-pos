export const PRINTER_TRANSPORT = 'PRINTER_TRANSPORT'

/** Envía bytes crudos a la impresora. El adaptador real (USB/serial/red) se
 * selecciona por configuración; es integración, fuera de la suite. */
export interface PrinterTransport {
  send(data: Buffer): Promise<void>
}

/** Adaptador de desarrollo: no requiere dispositivo físico. */
export class NoopPrinterTransport implements PrinterTransport {
  async send(_data: Buffer): Promise<void> {
    // En desarrollo no hay impresora conectada.
  }
}
