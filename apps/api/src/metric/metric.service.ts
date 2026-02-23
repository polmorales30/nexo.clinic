import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { calculateMifflinStJeor, calculateHarrisBenedict, Gender, calculateTDEE } from '../utils/metabolic';

@Injectable()
export class MetricService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.MetricCreateInput) {
        return this.prisma.metric.create({ data });
    }

    findAll(patientId: string) {
        return this.prisma.metric.findMany({
            where: { patientId },
            orderBy: { date: 'desc' }
        });
    }

    calculateMetabolicInfo(patientId: string, weightKg: number, heightCm: number, ageYears: number, gender: Gender, activityMultiplier: number, formula: 'mifflin' | 'harris' = 'mifflin') {
        let bmr = 0;
        if (formula === 'mifflin') {
            bmr = calculateMifflinStJeor(weightKg, heightCm, ageYears, gender);
        } else {
            bmr = calculateHarrisBenedict(weightKg, heightCm, ageYears, gender);
        }
        const tdee = calculateTDEE(bmr, activityMultiplier);
        return {
            patientId,
            bmr,
            tdee,
            formula
        };
    }
}
