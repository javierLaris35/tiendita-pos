import { INestApplication } from '@nestjs/common'

/** Habilita CORS para que el web empaquetado (Electron) pueda llamar a la API
 * local. `CORS_ORIGIN` lo acota en despliegues que lo necesiten. */
export function configureCors(app: INestApplication): void {
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  })
}
