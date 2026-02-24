import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnamnesisService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.AnamnesisCreateInput) {
    return this.prisma.anamnesis.create({ data });
  }

  findAll(patientId: string) {
    return this.prisma.anamnesis.findMany({ where: { patientId } });
  }

  findOne(id: string) {
    return this.prisma.anamnesis.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.AnamnesisUpdateInput) {
    return this.prisma.anamnesis.update({ where: { id }, data });
  }
}
