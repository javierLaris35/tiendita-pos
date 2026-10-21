import { ConfigService } from '@nestjs/config'

/**
 * Fuente única del secreto JWT. Lanza si JWT_SECRET no está definido (fail-fast),
 * para que el API nunca firme/verifique tokens con un secreto por defecto conocido.
 */
export function getJwtSecret(config: ConfigService): string {
  return config.getOrThrow<string>('JWT_SECRET')
}
