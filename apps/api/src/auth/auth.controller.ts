import { Body, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'
import { AuthService } from './auth.service'

class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateUser(dto.email, dto.password)
    if (!user) throw new UnauthorizedException('Credenciales inválidas')
    return this.auth.login(user)
  }
}
