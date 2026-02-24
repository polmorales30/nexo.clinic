import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FoodService {
  private readonly apiUrl = 'https://api.fatsecret.com/rest/server.api'; // Example base URL

  // Mocked for the sake of starting Phase 4 without an actual API key yet
  async queryFoods(query: string) {
    // In a real scenario, this would generate an OAuth token and request FatSecret API
    // return axios.get(`${this.apiUrl}?method=foods.search&search_expression=${query}&format=json`);

    // Mock response for testing UI
    return [
      {
        food_id: '1234',
        food_name: 'Pollo a la plancha',
        food_description:
          'Por 100g - Calorías: 165kcal | Grasa: 3.57g | Carbohidratos: 0.00g | Proteína: 31.02g',
      },
      {
        food_id: '5678',
        food_name: 'Arroz integral',
        food_description:
          'Por 100g - Calorías: 111kcal | Grasa: 0.90g | Carbohidratos: 22.78g | Proteína: 2.58g',
      },
    ].filter((f) => f.food_name.toLowerCase().includes(query.toLowerCase()));
  }

  async getFoodDetails(foodId: string) {
    // Mock details
    return {
      food_id: foodId,
      food_name: 'Mock Food',
      servings: {
        serving: [
          {
            metric_serving_amount: '100',
            metric_serving_unit: 'g',
            calories: '150',
            carbohydrate: '20',
            protein: '10',
            fat: '5',
          },
        ],
      },
    };
  }
}
