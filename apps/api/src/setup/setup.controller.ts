import { Body, Controller, Get, Post } from '@nestjs/common'
import { SetupDto } from './dto/setup.dto'
import { SetupService } from './setup.service'

// Rutas públicas: se usan en el primer arranque, antes de que exista cualquier usuario.
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  status() {
    return this.setup.status()
  }

  @Post()
  run(@Body() dto: SetupDto) {
    return this.setup.run(dto)
  }
}
