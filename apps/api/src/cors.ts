import { INestApplication } from '@nestjs/common'

/** Habilita CORS para que el web empaquetado (Electron) pueda llamar a la API
 * local. `CORS_ORIGIN` lo acota en despliegues que lo necesiten. */
export function configureCors(app: INestApplication): void {
  const raw = process.env.CORS_ORIGIN
  // 'true'/'*'/ausente → reflejar el Origin (incluye el `null` del web empaquetado
  // en file://). Un valor concreto acota a ese origen.
  const origin = !raw || raw === 'true' || raw === '*' ? true : raw
  app.enableCors({ origin, credentials: true })
}
