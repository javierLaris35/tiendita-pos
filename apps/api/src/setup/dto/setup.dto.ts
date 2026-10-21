import { Type } from 'class-transformer'
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

class AdminDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @MinLength(6)
  password!: string
}

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  businessName!: string

  @IsOptional()
  @IsString()
  rfc?: string

  @IsOptional()
  @IsString()
  ticketHeader?: string

  @IsOptional()
  @IsString()
  ticketFooter?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultIvaRate?: number

  @IsOptional()
  @IsIn(['network', 'serial', 'none'])
  printerType?: string

  @IsOptional()
  @IsString()
  printerTarget?: string

  @ValidateNested()
  @Type(() => AdminDto)
  admin!: AdminDto
}
