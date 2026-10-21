import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { PrismaClient } from '@prisma/client'
import { importOffRecords, OffRecord } from '../src/catalog/off-importer'

/**
 * Importa el volcado JSONL de Open Food Facts (una línea = un producto JSON) a
 * `CatalogItem`, por lotes. Paso de operación (no es parte de la suite).
 *
 *   node dist/scripts/import-off.js <ruta-al-dump.jsonl>
 */
async function main(): Promise<void> {
  const path = process.argv[2]
  if (!path) {
    console.error('Uso: import-off <archivo.jsonl>')
    process.exit(1)
  }

  const prisma = new PrismaClient()
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity })

  let batch: OffRecord[] = []
  let imported = 0
  let skipped = 0

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return
    const r = await importOffRecords(prisma, batch)
    imported += r.imported
    skipped += r.skipped
    batch = []
  }

  for await (const line of rl) {
    const t = line.trim()
    if (!t) continue
    try {
      batch.push(JSON.parse(t) as OffRecord)
    } catch {
      skipped++
      continue
    }
    if (batch.length >= 1000) await flush()
  }
  await flush()

  console.log(`OFF import: ${imported} importados, ${skipped} omitidos`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
