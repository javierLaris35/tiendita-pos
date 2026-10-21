import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class ReceiptDto {
  @IsString()
  @IsNotEmpty()
  barcode!: string

  @IsNumber()
  @Min(0.001)
  quantity!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number
}

export class WasteDto {
  @IsString()
  @IsNotEmpty()
  barcode!: string

  @IsNumber()
  @Min(0.001)
  quantity!: number

  @IsOptional()
  @IsString()
  note?: string
}

export class AdjustDto {
  @IsString()
  @IsNotEmpty()
  barcode!: string

  @IsNumber()
  @Min(0)
  newStock!: number

  @IsOptional()
  @IsString()
  note?: string
}
