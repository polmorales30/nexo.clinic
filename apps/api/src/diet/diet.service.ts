import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DietService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  create(data: Prisma.DietPlanCreateInput) {
    return this.prisma.dietPlan.create({ data });
  }

  findAllByPatient(patientId: string) {
    return this.prisma.dietPlan.findMany({
      where: { patientId },
      include: { meals: { include: { mealItems: true } } },
    });
  }

  async generateAiMenu(patientId: string, targetKcal: number) {
    // 1. Fetch latest anamnesis
    const anamnesis = await this.prisma.anamnesis.findFirst({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Generate menu layout via AI
    const rawMenuData = await this.aiService.generateWeeklyMenu(
      anamnesis?.data || {},
      targetKcal,
    );

    // 3. Optional: Parse rawMenuData and insert into DB via this.prisma.dietPlan.create...
    // Returning raw for the UI to preview before saving
    return rawMenuData;
  }
}
