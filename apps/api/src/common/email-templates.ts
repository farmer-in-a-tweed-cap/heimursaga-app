export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EXPLORER_PRO_NEW_ENTRY: 'explorer_pro_new_entry',
};

const templates: { key: string; subject: string | ((v?: any) => string); html: (v?: any) => string }[] =
  [
    {
      key: EMAIL_TEMPLATES.WELCOME,
      subject: 'welcome to heirmursaga',
      html: () => `welcome to heirmursaga!`,
    },
    {
      key: EMAIL_TEMPLATES.PASSWORD_RESET,
      subject: 'reset password',
      html: (v: { reset_link: string }) =>
        `reset your password using the link below\n, ${v?.reset_link}`,
    },
    {
      key: EMAIL_TEMPLATES.EXPLORER_PRO_NEW_ENTRY,
      subject: (v: { creatorUsername: string; postTitle: string }) => 
        `New journal entry from ${v.creatorUsername}`,
      html: (v: {
        creatorUsername: string;
        creatorPicture?: string;
        postTitle: string;
        postContent: string;
        postPlace?: string;
        postDate: string;
        postJourney?: string;
        postImages?: string[];
        postWaypoint?: { lat: number; lon: number };
        mapUrl?: string;
        postUrl: string;
        unsubscribeUrl: string;
        webViewUrl: string;
      }) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Journal Entry from ${v.creatorUsername}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .content { padding: 30px; }
            .entry-header { padding-bottom: 30px; margin-bottom: 0; }
            .section-divider { height: 1px; background-color: #e9ecef; margin: 40px 0; }
            .entry-title { font-size: 32px; font-weight: 500; color: #1a1a1a; margin: 0 0 12px 0; line-height: 1.2; }
            .location-date { font-size: 14px; color: #6c757d; margin-bottom: 12px; }
            .journey-info { font-size: 14px; color: #6c757d; margin-bottom: 12px; }
            .journey-name { color: #AC6D46; font-weight: 500; }
            .entry-byline { font-size: 14px; color: #6c757d; }
            .entry-author { color: #AC6D46; font-weight: 500; }
            .meta-icon { width: 16px; height: 16px; margin-right: 6px; opacity: 0.7; }
            .journey-badge { background: #AC6D46; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
            .entry-content { font-size: 16px; line-height: 1.8; color: #2c2c2c; margin: 0; }
            .entry-content p { margin: 0 0 18px 0; }
            .entry-map { margin: 0; }
            .map-image { width: 100%; max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .entry-images { margin: 0; }
            .entry-image { width: 100%; max-width: 100%; height: auto; border-radius: 12px; margin: 10px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .entry-footer { margin: 0; }
            .logged-on-text { font-size: 14px; color: #6c757d; margin: 0; }
            .creator-link { color: #AC6D46; text-decoration: none; }
            .creator-link:hover { text-decoration: underline; }
            .cta-section { text-align: center; margin: 35px 0; padding: 25px; background: #f8f9fa; border-radius: 12px; }
            .cta-button { display: inline-block; background: #4676AC; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.3s; }
            .cta-button:hover { background: #3a629a; }
            .footer { background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef; }
            .footer-text { color: #6c757d; font-size: 14px; margin: 0 0 15px 0; }
            .footer-links { margin-top: 15px; }
            .footer-links a { color: #6c757d; text-decoration: none; margin: 0 15px; font-size: 13px; }
            .footer-links a:hover { color: #AC6D46; }
            .explorer-pro-badge { background: linear-gradient(135deg, #AC6D46 0%, #8b5a37 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            @media (max-width: 600px) {
              .container { margin: 0; }
              .content { padding: 20px; }
              .entry-title { font-size: 24px; }
              .entry-meta { flex-direction: column; gap: 10px; }
              .creator-info { flex-direction: column; }
              .creator-avatar { margin: 0 0 10px 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Content -->
            <div class="content">
              <!-- Entry Header - matches PostCard layout -->
              <div class="entry-header">
                <div class="header-content">
                  <div class="left-content">
                    <div class="title-row">
                      <h2 class="entry-title">${v.postTitle}</h2>
                    </div>
                    <div class="location-date">
                      📍 ${v.postPlace ? `<span>${v.postPlace} | </span>` : ''}${v.postDate}
                    </div>
                    ${v.postJourney ? `<div class="journey-info"><span class="journey-name">${v.postJourney}</span></div>` : ''}
                    <div class="entry-byline">by <span class="entry-author">${v.creatorUsername}</span></div>
                  </div>
                </div>
              </div>

              <!-- Section Divider -->
              <div class="section-divider"></div>

              <!-- Static Map -->
              ${v.mapUrl ? `
                <div class="entry-map">
                  <img src="${v.mapUrl}" alt="Entry location map" class="map-image">
                </div>
                <!-- Section Divider -->
                <div class="section-divider"></div>
              ` : ''}

              <!-- Entry Content -->
              <div class="entry-content">
                ${v.postContent.split('\n').map(paragraph => 
                  paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
                ).join('')}
              </div>

              <!-- Entry Images -->
              ${v.postImages && v.postImages.length > 0 ? `
                <div class="entry-images">
                  ${v.postImages.map(image => `<img src="${image}" alt="Entry image" class="entry-image">`).join('')}
                </div>
              ` : ''}

              <!-- Section Divider -->
              <div class="section-divider"></div>

              <!-- Entry Footer - matches PostCard "logged on" section -->
              <div class="entry-footer">
                <p class="logged-on-text">
                  entry logged on ${v.postDate} by <a href="${v.postUrl}" class="creator-link">${v.creatorUsername}</a>
                </p>
              </div>

              <!-- Section Divider -->
              <div class="section-divider"></div>

              <!-- CTA Section -->
              <div class="cta-section">
                <a href="${v.postUrl}" class="cta-button">View Full Entry on Heimursaga</a>
                <p style="margin-top: 15px; color: #6c757d; font-size: 14px;">
                  Like, bookmark, or share this entry on the platform
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                <strong>📧 Explorer Pro Delivery</strong><br>
                You're receiving this because you sponsor ${v.creatorUsername} and have journal entry email delivery enabled.
              </p>
              <div class="footer-links">
                <a href="${v.webViewUrl}">View in Browser</a>
                <a href="${v.postUrl}">Visit Heimursaga</a>
                <a href="${v.unsubscribeUrl}">Unsubscribe</a>
              </div>
              <p style="margin-top: 20px; color: #adb5bd; font-size: 12px;">
                © ${new Date().getFullYear()} Heimursaga. Connecting explorers worldwide.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
  ];

export const getEmailTemplate = <T = any>(
  key: string,
  vars?: T,
): { subject: string; html: string } => {
  const template = templates.find((t) => t.key === key);
  if (!template) return null;

  const html = template.html(vars);
  const subject = typeof template.subject === 'function' 
    ? template.subject(vars) 
    : template.subject;

  return {
    subject,
    html,
  };
};
