import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { Prisma } from '@prisma/client';

@Controller('appointments')
export class AppointmentController {
    constructor(private readonly appointmentService: AppointmentService) { }

    @Post()
    create(@Body() createDto: Prisma.AppointmentCreateInput) {
        return this.appointmentService.create(createDto);
    }

    @Get('tenant/:tenantId')
    findAll(@Param('tenantId') tenantId: string) {
        return this.appointmentService.findAll(tenantId);
    }

    @Get('patient/:patientId')
    findByPatient(@Param('patientId') patientId: string) {
        return this.appointmentService.findByPatient(patientId);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.appointmentService.updateStatus(id, status);
    }
}

