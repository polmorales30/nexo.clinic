import { Controller, Post, Body } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
    constructor(private readonly stripeService: StripeService) { }

    @Post('payment-intent')
    async createPaymentIntent(@Body('amount') amount: number, @Body('currency') currency: string) {
        const paymentIntent = await this.stripeService.createPaymentIntent(amount, currency);
        return { clientSecret: paymentIntent.client_secret };
    }

    @Post('subscription')
    async createSubscription(@Body('customerId') customerId: string, @Body('priceId') priceId: string) {
        const subscription = await this.stripeService.createSubscription(customerId, priceId);
        return { subscriptionId: subscription.id, status: subscription.status };
    }
}

