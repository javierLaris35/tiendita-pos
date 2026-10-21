import { Type } from 'class-transformer'
import { ArrayNotEmpty, IsArray, IsIn, IsNumber, IsString, Min, ValidateNested } from 'class-validator'

class SaleItemDto {
  @IsString()
  barcode!: string

  @IsNumber()
  @Min(0.001)
  quantity!: number
}

class SalePaymentDto {
  @IsIn(['cash', 'card', 'transfer'])
  method!: 'cash' | 'card' | 'transfer'

  @IsNumber()
  @Min(0)
  amount!: number
}

export class CreateSaleDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[]

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments!: SalePaymentDto[]
}
