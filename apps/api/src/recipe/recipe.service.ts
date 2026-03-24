import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.RecipeUncheckedCreateInput) {
    return this.prisma.recipe.create({
      data,
    });
  }

  findAll(tenantId: string) {
    return this.prisma.recipe.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: string) {
    return this.prisma.recipe.findUnique({
      where: { id },
    });
  }

  update(id: string, data: Prisma.RecipeUpdateInput) {
    return this.prisma.recipe.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.recipe.delete({
      where: { id },
    });
  }
}
