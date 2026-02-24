import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PatientService } from './patient.service';
import { Prisma } from '@prisma/client';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create(@Body() createPatientDto: Prisma.PatientCreateInput) {
    return this.patientService.create(createPatientDto);
  }

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.patientService.findAll(tenantId);
  }
}
