import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';
import { Prisma } from '@prisma/client';

@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  @Post()
  create(@Body() createDto: Prisma.AnamnesisCreateInput) {
    return this.anamnesisService.create(createDto);
  }

  @Get('patient/:patientId')
  findAll(@Param('patientId') patientId: string) {
    return this.anamnesisService.findAll(patientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.anamnesisService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: Prisma.AnamnesisUpdateInput,
  ) {
    return this.anamnesisService.update(id, updateDto);
  }
}
