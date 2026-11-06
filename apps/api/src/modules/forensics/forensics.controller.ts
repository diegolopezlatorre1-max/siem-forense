import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type ForenseVerificacion, ForenseVerificacionSchema } from '@siem/shared';

import { Roles } from '../../common/auth/decoradores.js';
import { esquema } from '../../common/openapi.js';
import { ForenseService } from './forense.service.js';

@ApiTags('forense')
@ApiBearerAuth()
@Controller('forensics')
export class ForensicsController {
  constructor(private readonly forense: ForenseService) {}

  @Get('verify')
  @Roles('admin', 'auditor')
  @ApiResponse({ status: 200, schema: esquema(ForenseVerificacionSchema) })
  verificar(): Promise<ForenseVerificacion> {
    return this.forense.verificar();
  }
}
