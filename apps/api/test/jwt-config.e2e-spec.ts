import { ConfigService } from '@nestjs/config'
import { getJwtSecret } from '../src/auth/jwt-config'

describe('getJwtSecret', () => {
  it('lanza si JWT_SECRET no está definido (fail-fast, sin secreto por defecto)', () => {
    const prev = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    try {
      expect(() => getJwtSecret(new ConfigService({}))).toThrow()
    } finally {
      if (prev !== undefined) process.env.JWT_SECRET = prev
    }
  })

  it('devuelve el secreto cuando está definido', () => {
    expect(getJwtSecret(new ConfigService({ JWT_SECRET: 'abc' }))).toBe('abc')
  })
})
