import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  barcode!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsIn(['pz', 'kg'])
  unit?: 'pz' | 'kg'

  @IsNumber()
  @Min(0)
  price!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ivaRate?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  iepsRate?: number
}
