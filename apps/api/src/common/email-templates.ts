export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  EXPLORER_PRO_NEW_ENTRY: 'explorer_pro_new_entry',
  ADMIN_NEW_USER_SIGNUP: 'admin_new_user_signup',
};

const templates: { key: string; subject: string | ((v?: any) => string); html: (v?: any) => string }[] =
  [
    {
      key: EMAIL_TEMPLATES.WELCOME,
      subject: 'Welcome to Heimursaga! 🌍',
      html: (v: { username?: string } = {}) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Heimursaga</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #AC6D46; padding: 40px 30px; text-align: center; }
            .header h1 { color: white; font-size: 32px; font-weight: 600; margin: 0 0 10px 0; }
            .header p { color: rgba(255,255,255,0.9); font-size: 18px; margin: 0; font-weight: 400; }
            .content { padding: 40px 30px; }
            .welcome-section { text-align: center; margin-bottom: 40px; }
            .welcome-title { font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0 0 15px 0; }
            .welcome-text { font-size: 16px; color: #2c2c2c; margin: 0 0 30px 0; line-height: 1.6; font-weight: 400; }
            .features-section { margin: 40px 0; }
            .features-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px 0; text-align: center; }
            .feature { margin-bottom: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4676AC; }
            .feature-content h3 { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 5px 0; }
            .feature-content p { font-size: 14px; color: #6c757d; margin: 0; font-weight: 400; }
            .pro-badge { background: #AC6D46; color: white; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase; }
            .cta-section { text-align: center; margin: 40px 0; padding: 30px; background: #4676AC; border-radius: 12px; }
            .cta-section h3 { color: white; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; }
            .cta-button { display: inline-block; background: #AC6D46; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.3s; margin: 10px 0; }
            .cta-button:hover { background: #8b5a37; }
            .cta-text { color: rgba(255,255,255,0.9); font-size: 14px; margin: 15px 0 0 0; font-weight: 400; }
            .logo-section { text-align: center; padding: 20px 30px; background: white; }
            .logo { max-width: 200px; height: auto; }
            .upgrade-section { margin: 30px 0; padding: 25px; background: #f8f9fa; border: 2px solid #AC6D46; border-radius: 8px; text-align: center; }
            .upgrade-title { font-size: 18px; font-weight: 600; color: #AC6D46; margin: 0 0 10px 0; }
            .upgrade-text { font-size: 14px; color: #2c2c2c; margin: 0 0 15px 0; font-weight: 400; }
            .upgrade-button { display: inline-block; background: #AC6D46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; transition: all 0.3s; }
            .upgrade-button:hover { background: #8b5a37; }
            .tips-section { margin: 30px 0; padding: 25px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; }
            .tips-title { font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 15px 0; }
            .tip { font-size: 14px; color: #2c2c2c; margin: 8px 0; font-weight: 400; }
            .footer { background: #252525; padding: 25px; text-align: center; }
            .footer-text { color: #6c757d; font-size: 14px; margin: 0; font-weight: 400; }
            .footer-brand { color: #AC6D46; font-size: 16px; font-weight: 600; margin: 0 0 10px 0; }
            @media (max-width: 600px) {
              .container { margin: 0; }
              .header { padding: 30px 20px; }
              .content { padding: 30px 20px; }
              .logo-section { padding: 15px 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Logo -->
            <div class="logo-section">
              <img src="${process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://heimursaga.com'}/logo-lg-dark.svg" alt="Heimursaga" class="logo">
            </div>
            
            <!-- Header -->
            <div class="header">
              <h1>Welcome to Heimursaga!</h1>

            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <div class="welcome-section">
                <p class="welcome-text">Dear ${v.username || 'Explorer'},</p>
                <p class="welcome-text">I'd like to personally thank you for giving Heimursaga a try. I know you have a lot of options when it comes to fundraising and journaling platforms, but I think you'll find this app is something special. Welcome to exploration with Heimursaga, this is just the beginning!</p>
                <p class="welcome-text">Cheers,<br>explorer1</p>
                <p><small>P.S. We're always available at admin@heimursaga.com if you have any questions, comments or suggestions.</small></p>
              </div>

              <!-- Features -->
              <div class="features-section">
                <h3 class="features-title">What you can do on Heimursaga:</h3>
                
                <div class="feature">
                  <div class="feature-content">
                    <h3>Map-Centric Exploration</h3>
                    <p>Use the map or feed to discover journal entries and explorers around the world</p>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-content">
                    <h3>Text-Focused Journaling</h3>
                    <p>Create geo-tagged entries with photos and share your adventures</p>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-content">
                    <h3>Follow & Discover</h3>
                    <p>Follow other explorers to stay updated on their adventures</p>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-content">
                    <h3>Sponsor</h3>
                    <p>Sponsor an explorer and receive all their journal entries in your email inbox, including exclusive sponsor-only entries!</p>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-content">
                    <h3>Plan Journeys <span class="pro-badge">Pro</span></h3>
                    <p>Create trip itineraries and organize waypoints and journal entries with Journey Builder</p>
                  </div>
                </div>

                <div class="feature">
                  <div class="feature-content">
                    <h3>Receive Sponsorships <span class="pro-badge">Pro</span></h3>
                    <p>Connect with sponsors and receive payments to support your explorations</p>
                  </div>
                </div>
              </div>

              <!-- CTA Section -->
              <div class="cta-section">
                <h3>Ready to start exploring?</h3>
                <a href="${process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://heimursaga.com'}/explore" class="cta-button">Start Exploring</a>
                <p class="cta-text">
                  Discover amazing stories and connect with fellow explorers
                </p>
              </div>

              <!-- Upgrade Section -->
              <div class="upgrade-section">
                <h3 class="upgrade-title">Want to unlock all features?</h3>
                <p class="upgrade-text">
                  Upgrade to Explorer Pro ($7/month) to receive sponsorships, plan and share journeys, and access detailed analytics.
                </p>
                <a href="${process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://heimursaga.com'}/upgrade" class="upgrade-button">Upgrade to Pro</a>
              </div>

              <!-- Quick Tips -->
              <div class="tips-section">
                <h3 class="tips-title">Quick Tips to Get Started:</h3>
                <div class="tip">• Complete your profile to help others discover you</div>
                <div class="tip">• Create your first journal entry about a recent adventure</div>
                <div class="tip">• Follow other explorers whose content inspires you</div>
                <div class="tip">• Sponsor an explorer!</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-brand">HEIMURSAGA</p>
              <p class="footer-text">
                © ${new Date().getFullYear()} Heimursaga, an app for explorers. Share your stories. Raise money. Inspire the world.
              </p>
              <p style="margin-top: 15px; color: #6c757d; font-size: 12px; font-weight: 400;">
                Happy exploring!
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    {
      key: EMAIL_TEMPLATES.PASSWORD_RESET,
      subject: 'reset password',
      html: (v: { reset_link: string }) =>
        `reset your password using the link below\n, ${v?.reset_link}`,
    },
    {
      key: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
      subject: 'verify your email address',
      html: (v: { verification_link: string }) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email Address</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .content { padding: 40px 30px; text-align: center; }
            .header { margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: 600; color: #1a1a1a; margin: 0 0 10px 0; }
            .subtitle { font-size: 16px; color: #6c757d; margin: 0 0 30px 0; }
            .message { font-size: 16px; color: #2c2c2c; margin: 0 0 30px 0; line-height: 1.6; }
            .cta-button { display: inline-block; background: #4676AC; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.3s; margin: 20px 0; }
            .cta-button:hover { background: #3a629a; }
            .footer { background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef; }
            .footer-text { color: #6c757d; font-size: 14px; margin: 0; }
            .alt-link { color: #6c757d; font-size: 14px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <div class="header">
                <h1 class="title">Verify Your Email Address</h1>
                <p class="subtitle">Welcome to Heimursaga!</p>
              </div>
              
              <p class="message">
                Thank you for signing up! To complete your registration and start exploring, please verify your email address by clicking the button below.
              </p>
              
              <a href="${v.verification_link}" class="cta-button">Verify Email Address</a>
              
              <p class="message">
                This verification link will expire in 24 hours. If you didn't create an account with Heimursaga, you can safely ignore this email.
              </p>
              
              <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <span class="alt-link">${v.verification_link}</span>
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} Heimursaga, an app for explorers. Share your stories. Raise money. Inspire the world.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
                ${v.postContent
                  .split('\\n')
                  .filter(line => line.trim() !== '')
                  .map(line => `<p>${line.trim()}</p>`)
                  .join('')}
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
                © ${new Date().getFullYear()} Heimursaga, an app for explorers. Share your stories. Raise money. Inspire the world.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    },
    {
      key: EMAIL_TEMPLATES.ADMIN_NEW_USER_SIGNUP,
      subject: (v: { username: string; email: string }) => `New user signup: ${v.username}`,
      html: (v: { 
        username: string;
        email: string;
        signupDate: string;
        userProfileUrl?: string;
      }) => `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New User Signup Notification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #4676AC; padding: 30px; text-align: center; }
            .header h1 { color: white; font-size: 24px; font-weight: 600; margin: 0; }
            .content { padding: 30px; }
            .user-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .info-label { font-weight: 600; color: #2c2c2c; }
            .info-value { color: #6c757d; }
            .cta-button { display: inline-block; background: #AC6D46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; transition: all 0.3s; margin-top: 15px; }
            .cta-button:hover { background: #8b5a37; }
            .footer { background: #252525; padding: 20px; text-align: center; }
            .footer-text { color: #6c757d; font-size: 14px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New User Signup</h1>
            </div>
            
            <div class="content">
              <p>A new user has signed up for Heimursaga!</p>
              
              <div class="user-info">
                <div class="info-row">
                  <span class="info-label">Username:</span>
                  <span class="info-value">${v.username}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${v.email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Signup Date:</span>
                  <span class="info-value">${v.signupDate}</span>
                </div>
              </div>
              
              ${v.userProfileUrl ? `
                <div style="text-align: center;">
                  <a href="${v.userProfileUrl}" class="cta-button">View User Profile</a>
                </div>
              ` : ''}
              
              <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
                This is an automated notification from the Heimursaga platform.
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} Heimursaga Admin Notifications
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
