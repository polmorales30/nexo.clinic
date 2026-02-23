import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PatientService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.PatientCreateInput) {
        return this.prisma.patient.create({ data });
    }

    findAll(tenantId: string) {
        return this.prisma.patient.findMany({ where: { tenantId } });
    }
}
