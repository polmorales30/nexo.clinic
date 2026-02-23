import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AppointmentService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.AppointmentCreateInput) {
        return this.prisma.appointment.create({ data });
    }

    findAll(tenantId: string) {
        return this.prisma.appointment.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' },
            include: { patient: true, nutritionist: true }
        });
    }

    findByPatient(patientId: string) {
        return this.prisma.appointment.findMany({
            where: { patientId },
            orderBy: { date: 'asc' },
            include: { nutritionist: true }
        });
    }

    updateStatus(id: string, status: string) {
        return this.prisma.appointment.update({ where: { id }, data: { status } });
    }
}

