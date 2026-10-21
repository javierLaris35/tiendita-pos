import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Devuelve el usuario si las credenciales son válidas, o null. Mismo null para
   * "no existe" y "password incorrecta", para no filtrar si el correo existe. */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const ok = await bcrypt.compare(password, user.passwordHash)
    return ok ? user : null
  }

  login(user: User): { access_token: string } {
    const access_token = this.jwt.sign({ sub: user.id, role: user.role })
    return { access_token }
  }
}
