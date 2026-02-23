import { Controller, Get, Query, Param } from '@nestjs/common';
import { FoodService } from './food.service';

@Controller('food')
export class FoodController {
    constructor(private readonly foodService: FoodService) { }

    @Get('search')
    searchFoods(@Query('q') query: string) {
        if (!query) return [];
        return this.foodService.queryFoods(query);
    }

    @Get(':id')
    getFoodDetails(@Param('id') id: string) {
        return this.foodService.getFoodDetails(id);
    }
}

