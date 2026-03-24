import { Controller, Post, Get, Param, Body, Patch } from '@nestjs/common';
import { ShoppingListService } from './shopping-list.service';

@Controller('shopping-list')
export class ShoppingListController {
    constructor(private readonly shoppingListService: ShoppingListService) { }

    @Post('generate/:dietPlanId')
    generateList(@Param('dietPlanId') dietPlanId: string) {
        return this.shoppingListService.generateFromDietPlan(dietPlanId);
    }

    @Get('patient/:patientId')
    getByPatient(@Param('patientId') patientId: string) {
        return this.shoppingListService.getListByPatient(patientId);
    }

    @Patch('item/:itemId')
    toggleItem(@Param('itemId') itemId: string, @Body('isChecked') isChecked: boolean) {
        return this.shoppingListService.toggleItemStatus(itemId, isChecked);
    }
}
