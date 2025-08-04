import { Controller, Get, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { getEmailTemplate, EMAIL_TEMPLATES } from '@/common/email-templates';
import { Public } from '@/common/decorators';

@Controller('dev')
export class DevController {
  @Public()
  @Get('email-preview')
  async getEmailPreview(
    @Query('template') template: string,
    @Res() res: FastifyReply,
  ) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).send('Not found');
    }

    let emailData;
    
    // Provide sample data for each template
    switch (template) {
      case EMAIL_TEMPLATES.WELCOME:
        emailData = getEmailTemplate(EMAIL_TEMPLATES.WELCOME, {
          username: 'jane_explorer',
        });
        break;
        
      case EMAIL_TEMPLATES.PASSWORD_RESET:
        emailData = getEmailTemplate(EMAIL_TEMPLATES.PASSWORD_RESET, {
          reset_link: 'https://heimursaga.com/reset-password?token=sample-token-123',
        });
        break;
        
      case EMAIL_TEMPLATES.EMAIL_VERIFICATION:
        emailData = getEmailTemplate(EMAIL_TEMPLATES.EMAIL_VERIFICATION, {
          verification_link: 'https://heimursaga.com/verify-email?token=sample-verification-token-123',
        });
        break;
        
      case EMAIL_TEMPLATES.EXPLORER_PRO_NEW_ENTRY:
        emailData = getEmailTemplate(EMAIL_TEMPLATES.EXPLORER_PRO_NEW_ENTRY, {
          creatorUsername: 'explorer_jane',
          creatorPicture: 'https://via.placeholder.com/60x60',
          postTitle: 'Sunrise Over the Himalayas',
          postContent: 'After hiking for 3 days through challenging terrain, we finally reached the summit just as the sun began to rise. The view was absolutely breathtaking - golden light spreading across the mountain peaks as far as the eye could see.\n\nThe temperature was -15°C, but the warmth from this incredible sight made every frozen step worth it. This is why I explore - for moments like these that remind you how beautiful our world truly is.',
          postPlace: 'Mount Everest Base Camp, Nepal',
          postDate: 'March 15, 2024',
          postJourney: 'Himalayan Adventure 2024',
          postImages: [
            'https://via.placeholder.com/600x400/FF6B6B/FFFFFF?text=Sunrise+Mountain+View',
            'https://via.placeholder.com/600x400/4ECDC4/FFFFFF?text=Base+Camp'
          ],
          postWaypoint: { lat: 27.9881, lon: 86.9250 },
          mapUrl: 'https://via.placeholder.com/600x300/45B7D1/FFFFFF?text=Map+Location',
          postUrl: 'https://heimursaga.com/entries/sample-entry-123',
          unsubscribeUrl: 'https://heimursaga.com/unsubscribe?token=sample-token',
          webViewUrl: 'https://heimursaga.com/emails/sample-email-123',
        });
        break;
        
      default:
        return res.status(400).send('Invalid template');
    }

    if (!emailData) {
      return res.status(404).send('Template not found');
    }

    // Set proper content type and return HTML
    res.header('Content-Type', 'text/html');
    return res.send(emailData.html);
  }
}