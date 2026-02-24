import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DietService } from './diet.service';
import { Prisma } from '@prisma/client';

@Controller('diets')
export class DietController {
  constructor(private readonly dietService: DietService) {}

  @Post()
  create(@Body() createDto: Prisma.DietPlanCreateInput) {
    return this.dietService.create(createDto);
  }

  @Get('patient/:patientId')
  findAll(@Param('patientId') patientId: string) {
    return this.dietService.findAllByPatient(patientId);
  }

  @Post('generate-ai/:patientId')
  generateMenu(
    @Param('patientId') patientId: string,
    @Body('targetKcal') targetKcal: number,
  ) {
    return this.dietService.generateAiMenu(patientId, targetKcal);
  }
}
