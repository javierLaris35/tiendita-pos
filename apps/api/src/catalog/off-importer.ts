import { PrismaClient } from '@prisma/client'

export interface OffRecord {
  code?: string
  product_name?: string
  brands?: string
  categories?: string
  image_url?: string
  countries_tags?: string[]
}

export interface ImportResult {
  imported: number
  skipped: number
}

/**
 * Upsert de registros de Open Food Facts en `CatalogItem`. Omite los que no
 * tienen código o nombre, y los que no son de México. Idempotente (upsert por
 * `code`), así reimportar no duplica.
 */
export async function importOffRecords(
  prisma: Pick<PrismaClient, 'catalogItem'>,
  records: OffRecord[],
): Promise<ImportResult> {
  let imported = 0
  let skipped = 0

  for (const r of records) {
    if (!r.code || !r.product_name || !r.countries_tags?.includes('en:mexico')) {
      skipped++
      continue
    }
    const data = {
      name: r.product_name,
      brand: r.brands ?? null,
      category: r.categories ?? null,
      image: r.image_url ?? null,
    }
    await prisma.catalogItem.upsert({
      where: { code: r.code },
      update: data,
      create: { code: r.code, ...data },
    })
    imported++
  }

  return { imported, skipped }
}
