import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(data: Prisma.AppointmentCreateInput) {
    const appointment = await this.prisma.appointment.create({ 
      data,
      include: { patient: true }
    });

    if (appointment.patient) {
      this.notificationService.sendAppointmentNotification(
        appointment.patient.email,
        appointment.patient.phone,
        appointment.date,
        'scheduled'
      );
    }

    return appointment;
  }

  findAll(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
      include: { patient: true, nutritionist: true },
    });
  }

  findByPatient(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { date: 'asc' },
      include: { nutritionist: true },
    });
  }

  async updateStatus(id: string, status: string) {
    const appointment = await this.prisma.appointment.update({ 
      where: { id }, 
      data: { status },
      include: { patient: true }
    });

    if (appointment.patient && status !== 'CANCELLED') {
      this.notificationService.sendAppointmentNotification(
        appointment.patient.email,
        appointment.patient.phone,
        appointment.date,
        'updated'
      );
    }

    return appointment;
  }
}
