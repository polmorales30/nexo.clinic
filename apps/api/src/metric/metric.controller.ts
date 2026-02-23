import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MetricService } from './metric.service';
import { Prisma } from '@prisma/client';
import { Gender } from '../utils/metabolic';

@Controller('metrics')
export class MetricController {
    constructor(private readonly metricService: MetricService) { }

    @Post()
    create(@Body() createMetricDto: Prisma.MetricCreateInput) {
        return this.metricService.create(createMetricDto);
    }

    @Get('patient/:patientId')
    findAll(@Param('patientId') patientId: string) {
        return this.metricService.findAll(patientId);
    }

    @Get('calculate/:patientId')
    calculate(
        @Param('patientId') patientId: string,
        @Query('weightKg') weightKg: number,
        @Query('heightCm') heightCm: number,
        @Query('ageYears') ageYears: number,
        @Query('gender') gender: Gender,
        @Query('activityMultiplier') activityMultiplier: number,
        @Query('formula') formula: 'mifflin' | 'harris'
    ) {
        return this.metricService.calculateMetabolicInfo(
            patientId, Number(weightKg), Number(heightCm), Number(ageYears), gender, Number(activityMultiplier), formula
        );
    }
}
