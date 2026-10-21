import { IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator'

export class OpenDto {
  @IsNumber()
  @Min(0)
  openingAmount!: number
}

export class MovementDto {
  @IsIn(['in', 'out'])
  type!: 'in' | 'out'

  @IsNumber()
  @Min(0.01)
  amount!: number

  @IsString()
  @IsNotEmpty()
  reason!: string
}

export class CloseDto {
  @IsObject()
  countedBreakdown!: Record<string, number>

  @IsOptional()
  @IsString()
  notes?: string
}
