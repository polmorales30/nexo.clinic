import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PatientModule } from './patient/patient.module';
import { AnamnesisModule } from './anamnesis/anamnesis.module';
import { MetricModule } from './metric/metric.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppointmentModule } from './appointment/appointment.module';
import { StripeModule } from './stripe/stripe.module';
import { FoodModule } from './food/food.module';
import { AiModule } from './ai/ai.module';
import { DietModule } from './diet/diet.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { RecipeModule } from './recipe/recipe.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    PatientModule,
    AnamnesisModule,
    MetricModule,
    PrismaModule,
    AppointmentModule,
    ShoppingListModule,
    StripeModule,
    FoodModule,
    AiModule,
    DietModule,
    RecipeModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
