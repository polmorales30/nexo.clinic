import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { Twilio } from 'twilio';

@Injectable()
export class NotificationService {
  private logger = new Logger(NotificationService.name);
  private resend: Resend;
  private twilioClient: Twilio;

  constructor() {
    // Initialize providers; use dummy or empty keys if not provided in environment
    const resendApiKey = process.env.RESEND_API_KEY || 're_dummy_key';
    this.resend = new Resend(resendApiKey);

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_dummy_sid';
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || 'dummy_token';
    this.twilioClient = new Twilio(twilioAccountSid, twilioAuthToken);
  }

  async sendAppointmentNotification(email: string | null, phone: string | null, date: Date, type: 'scheduled' | 'updated' = 'scheduled') {
    const dateString = date.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
    const message = type === 'scheduled' 
      ? `Tu cita ha sido programada para el ${dateString}.`
      : `Tu cita ha sido actualizada. Nueva fecha: ${dateString}.`;

    // 1. Send Email Notification
    if (email) {
      try {
        if (process.env.RESEND_API_KEY) {
          await this.resend.emails.send({
            from: 'NEXO Clinic <notificaciones@tu-dominio.com>', // Replace with verified domain
            to: [email],
            subject: type === 'scheduled' ? 'Confirmación de Cita' : 'Actualización de Cita',
            html: `<p>${message}</p>`,
          });
          this.logger.log(`Email sent to ${email}`);
        } else {
          this.logger.log(`[Mock] Email sent to ${email}: ${message}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send email to ${email}`, error);
      }
    }

    // 2. Send Mobile Notification (SMS)
    if (phone) {
      try {
        if (process.env.TWILIO_ACCOUNT_SID) {
          await this.twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            to: phone,
          });
          this.logger.log(`SMS sent to ${phone}`);
        } else {
          this.logger.log(`[Mock] SMS sent to ${phone}: ${message}`);
        }
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${phone}`, error);
      }
    }
  }
}
