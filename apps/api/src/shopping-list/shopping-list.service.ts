import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShoppingListService {
    constructor(private prisma: PrismaService) { }

    async generateFromDietPlan(dietPlanId: string) {
        // Determine the active DietPlan and its items
        const dietPlan = await this.prisma.dietPlan.findUnique({
            where: { id: dietPlanId },
            include: {
                meals: {
                    include: {
                        mealItems: true,
                    },
                },
            },
        });

        if (!dietPlan) {
            throw new NotFoundException('Diet plan not found');
        }

        // Process ingredients into a map to group identical items
        const itemMap = new Map<string, { quantity: number; unit: string; category?: string }>();

        for (const meal of dietPlan.meals) {
            for (const item of meal.mealItems) {
                // Simple normalization: convert to lowercase and remove common variations if needed
                const normalizedName = item.foodSource.toLowerCase().trim();

                // Basic categorization based on keywords for MVP
                let category = 'Otros';
                if (normalizedName.match(/pollo|ternera|cerdo|pavo|merluza|salmón|bacalao|atún/i)) {
                    category = 'Carnes y Pescados';
                } else if (normalizedName.match(/lechuga|tomate|cebolla|ajo|zanahoria|brócoli|espinaca|patata|pimiento|calabacín|berenjena/i)) {
                    category = 'Frutas y Verduras';
                } else if (normalizedName.match(/arroz|pasta|pan|avena|quinoa|lentejas|garbanzos|alubias/i)) {
                    category = 'Cereales y Legumbres';
                } else if (normalizedName.match(/leche|queso|yogur|huevo/i)) {
                    category = 'Lácteos y Huevos';
                } else if (normalizedName.match(/aceite|nuez|almendra|cacahuete/i)) {
                    category = 'Grasas y Frutos Secos';
                }

                const existing = itemMap.get(normalizedName);
                if (existing) {
                    existing.quantity += item.quantityGrams;
                } else {
                    itemMap.set(normalizedName, {
                        quantity: item.quantityGrams,
                        unit: 'g', // Assuming standard is grams in MealItem quantityGrams
                        category,
                    });
                }
            }
        }

        // Persist to DB
        const shoppingList = await this.prisma.shoppingList.create({
            data: {
                patientId: dietPlan.patientId,
                dietPlanId: dietPlan.id,
                weekNumber: 1, // Defaulting to week 1 for MVP
                items: {
                    create: Array.from(itemMap.entries()).map(([foodName, data]) => ({
                        foodName: foodName.charAt(0).toUpperCase() + foodName.slice(1),
                        quantity: Math.round(data.quantity),
                        unit: data.unit,
                        category: data.category,
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        return shoppingList;
    }

    async getListByPatient(patientId: string) {
        return this.prisma.shoppingList.findFirst({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            include: { items: true },
        });
    }

    async toggleItemStatus(itemId: string, isChecked: boolean) {
        return this.prisma.shoppingItem.update({
            where: { id: itemId },
            data: { isChecked },
        });
    }
}
