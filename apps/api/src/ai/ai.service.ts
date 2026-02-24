import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'sk-mock-key',
    });
  }

  async generateWeeklyMenu(anamnesisData: any, targetKcal: number) {
    // In production we would send a complex prompt to GPT-4o with RAG
    const prompt = `Actúa como un nutricionista experto. Crea un menú semanal para un paciente con un objetivo de ${targetKcal} kcal diarias, dadas sus preferencias: ${JSON.stringify(anamnesisData)}`;

    // Mock response to avoid billing if API key is not present during dev
    if (!process.env.OPENAI_API_KEY) {
      return {
        message: 'Mock Menu generated based on ' + targetKcal + 'kcal.',
        structuredMenu: [
          {
            day: 1,
            meals: [{ type: 'Breakfast', food: 'Avena con leche', kcal: 350 }],
          },
        ],
      };
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }
}
