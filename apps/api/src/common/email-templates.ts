export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  EXPLORER_PRO_NEW_ENTRY: 'explorer_pro_new_entry',
  ADMIN_NEW_USER_SIGNUP: 'admin_new_user_signup',
  NEW_ENTRY_NOTIFICATION: 'new_entry_notification',
  SPONSORSHIP_RECEIVED: 'sponsorship_received',
  UPGRADE_CONFIRMATION: 'upgrade_confirmation',
  PAYMENT_RECEIPT: 'payment_receipt',
  EXPEDITION_MILESTONE: 'expedition_milestone',
  MONTHLY_DIGEST: 'monthly_digest',
};

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://heimursaga.com';

// Base email wrapper template
const emailWrapper = (
  content: string,
  preheaderText?: string,
  unsubscribeUrl?: string,
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Heimursaga</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #202020;">
  ${preheaderText ? `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f5f5f5;">${preheaderText}</div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tbody>
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
            <tbody>
              <!-- Header with logo and tagline -->
              <tr>
                <td style="background-color: #202020; padding: 24px; border-bottom: 3px solid #ac6d46; text-align: center;">
                  <a href="${APP_BASE_URL}" style="text-decoration: none;">
                    <img src="${APP_BASE_URL}/logo-lg-light.svg" alt="Heimursaga" width="200" height="48" style="height: 48px; width: auto; display: block; border: 0; margin: 0 auto;">
                  </a>
                  <div style="font-size: 11px; color: #b5bcc4; margin-top: 8px; font-family: monospace; letter-spacing: 0.5px; text-align: center;">
                    EXPLORE · DISCOVER · SHARE · SPONSOR · INSPIRE
                  </div>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="background-color: #ffffff; border: 2px solid #202020; border-top: none;">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #202020; padding: 24px; border-top: 2px solid #616161;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tbody>
                      <tr>
                        <td style="font-size: 11px; color: #b5bcc4; line-height: 1.6;">
                          <div style="margin-bottom: 12px;">
                            <strong style="color: #ffffff;">SYSTEM NOTIFICATION</strong> • This email was sent by Heimursaga
                          </div>
                          <div style="margin-bottom: 12px;">
                            <a href="${APP_BASE_URL}/settings/notifications" style="color: #4676ac; text-decoration: none;">Notification Settings</a>
                            &nbsp;•&nbsp;
                            <a href="${APP_BASE_URL}/documentation" style="color: #4676ac; text-decoration: none;">Documentation</a>
                            &nbsp;•&nbsp;
                            <a href="${APP_BASE_URL}/contact" style="color: #4676ac; text-decoration: none;">Contact Support</a>
                          </div>
                          ${
                            unsubscribeUrl
                              ? `<div style="margin-bottom: 12px; padding-top: 12px; border-top: 1px solid #616161;">
                            <a href="${unsubscribeUrl}" style="color: #b5bcc4; text-decoration: underline; font-size: 10px;">Unsubscribe from these emails</a>
                          </div>`
                              : ''
                          }
                          <div style="font-size: 10px; color: #616161;">
                            © ${new Date().getFullYear()} Heimursaga. All rights reserved.
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;

// Reusable email components as functions
const emailSection = (content: string, bgColor?: string) => `
<div style="padding: 24px;${bgColor ? ` background-color: ${bgColor};` : ''}">
  ${content}
</div>
`;

const emailHeading = (text: string, level: 1 | 2 | 3 = 1) => {
  const styles = {
    1: 'font-size: 20px; font-weight: bold; color: #202020; margin-bottom: 16px;',
    2: 'font-size: 16px; font-weight: bold; color: #202020; margin-bottom: 12px;',
    3: 'font-size: 14px; font-weight: bold; color: #202020; margin-bottom: 8px;',
  };
  return `<div style="${styles[level]}">${text}</div>`;
};

const emailButton = (
  href: string,
  text: string,
  variant: 'primary' | 'secondary' = 'primary',
) => {
  const bgColor = variant === 'primary' ? '#ac6d46' : '#4676ac';
  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
  <tbody>
    <tr>
      <td align="center" style="background-color: ${bgColor}; padding: 14px 28px;">
        <a href="${href}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; letter-spacing: 0.5px;">
          ${text}
        </a>
      </td>
    </tr>
  </tbody>
</table>
`;
};

const emailInfoBox = (
  content: string,
  variant: 'info' | 'warning' | 'success' = 'info',
) => {
  const colors = {
    info: { border: '#4676ac', bg: '#f0f4f8' },
    warning: { border: '#ac6d46', bg: '#fff7f0' },
    success: { border: '#4676ac', bg: '#f0f8f4' },
  };
  return `
<div style="border: 2px solid ${colors[variant].border}; background-color: ${colors[variant].bg}; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.6;">
  ${content}
</div>
`;
};

const emailDataTable = (data: Array<{ label: string; value: string }>) => `
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="border: 2px solid #202020; margin: 16px 0; font-size: 13px;">
  <tbody>
    ${data
      .map(
        (row, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f5f5f5' : '#ffffff'};">
      <td style="font-weight: bold; color: #616161; padding: 8px 12px; width: 40%; font-size: 11px;">
        ${row.label}
      </td>
      <td style="color: #202020; padding: 8px 12px; font-weight: bold;">
        ${row.value}
      </td>
    </tr>
    `,
      )
      .join('')}
  </tbody>
</table>
`;

const emailDivider = () =>
  `<div style="border-top: 2px solid #b5bcc4; margin: 24px 0;"></div>`;

// Template definitions
const templates: {
  key: string;
  subject: string | ((v?: any) => string);
  html: (v?: any) => string;
}[] = [
  {
    key: EMAIL_TEMPLATES.WELCOME,
    subject: 'Welcome to Heimursaga',
    html: (
      v: { username?: string; accountType?: 'explorer' | 'explorer_pro' } = {},
    ) => {
      const content = emailSection(`
        ${emailHeading('WELCOME TO HEIMURSAGA', 1)}

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          Hello <strong>${v.username || 'Explorer'}</strong>,
        </p>

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          Your account has been created successfully. You now have access to the platform's journaling and exploration tools.
        </p>

        ${
          v.accountType === 'explorer_pro'
            ? emailInfoBox(
                `
          <strong style="display: block; margin-bottom: 8px;">EXPLORER PRO ACCOUNT ACTIVE</strong>
          Your account includes sponsorship reception capabilities, advanced analytics, and premium features.
        `,
                'success',
              )
            : ''
        }

        ${emailHeading('GETTING STARTED', 2)}

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
          <tbody>
            <tr>
              <td style="padding-bottom: 12px;">
                <strong style="font-size: 13px; color: #202020;">1. COMPLETE YOUR PROFILE</strong>
                <div style="font-size: 13px; color: #616161; margin-top: 4px;">
                  Add your bio, location, and avatar to help other explorers find you.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px;">
                <strong style="font-size: 13px; color: #202020;">2. CREATE YOUR FIRST EXPEDITION</strong>
                <div style="font-size: 13px; color: #616161; margin-top: 4px;">
                  Plan your journey and set up expedition parameters.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px;">
                <strong style="font-size: 13px; color: #202020;">3. START JOURNALING</strong>
                <div style="font-size: 13px; color: #616161; margin-top: 4px;">
                  Document your experiences with entries, photos, and data logs.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 12px;">
                <strong style="font-size: 13px; color: #202020;">4. CONNECT WITH EXPLORERS</strong>
                <div style="font-size: 13px; color: #616161; margin-top: 4px;">
                  Follow other explorers and support expeditions through sponsorships.
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        ${emailButton(`${APP_BASE_URL}/select-expedition`, 'LOG ENTRY', 'primary')}
        ${emailButton(`${APP_BASE_URL}/explorer/${v.username || ''}`, 'VIEW PROFILE', 'secondary')}

        <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4;">
          <strong style="display: block; margin-bottom: 4px; color: #202020;">NEED HELP?</strong>
          Review our <a href="${APP_BASE_URL}/documentation" style="color: #4676ac;">documentation</a> or <a href="${APP_BASE_URL}/explorer-guidelines" style="color: #4676ac;">explorer guidelines</a> to learn more about the platform.
        </div>
      `);
      return emailWrapper(
        content,
        'Welcome to Heimursaga - Start your exploration journey',
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.PASSWORD_RESET,
    subject: 'Password Reset Request',
    html: (
      v: {
        username?: string;
        resetToken?: string;
        reset_link?: string;
        expiresInMinutes?: number;
      } = {},
    ) => {
      const resetUrl =
        v.reset_link ||
        `${APP_BASE_URL}/auth/reset-password/${v.resetToken || ''}`;
      const content = emailSection(`
        ${emailHeading('PASSWORD RESET REQUEST', 1)}

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          Hello <strong>${v.username || 'Explorer'}</strong>,
        </p>

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          A password reset was requested for your account. Click the button below to create a new password.
        </p>

        ${emailInfoBox(
          `
          <strong style="display: block; margin-bottom: 4px;">SECURITY NOTICE</strong>
          This link expires in <strong>${v.expiresInMinutes || 60} minutes</strong>. If you did not request this reset, ignore this email and your password will remain unchanged.
        `,
          'warning',
        )}

        ${emailButton(resetUrl, 'RESET PASSWORD', 'primary')}

        <div style="font-size: 11px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4; font-family: monospace; word-break: break-all;">
          <strong style="display: block; margin-bottom: 8px; color: #202020; font-family: sans-serif;">MANUAL LINK</strong>
          If the button doesn't work, copy this URL:
          <div style="margin-top: 8px; color: #4676ac;">
            ${resetUrl}
          </div>
        </div>

        <div style="font-size: 12px; color: #616161; margin-top: 16px; line-height: 1.6;">
          <strong style="color: #202020;">REQUEST DETAILS:</strong>
          <br>
          Time: ${new Date().toUTCString()}
          <br>
          IP address and browser information logged for security purposes.
        </div>
      `);
      return emailWrapper(
        content,
        'Password reset request for your Heimursaga account',
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.EMAIL_VERIFICATION,
    subject: 'Verify Your Email Address',
    html: (
      v: {
        username?: string;
        verificationToken?: string;
        verification_link?: string;
        expiresInHours?: number;
      } = {},
    ) => {
      const verificationUrl =
        v.verification_link ||
        `${APP_BASE_URL}/auth/verify/${v.verificationToken || ''}`;
      const content = emailSection(`
        ${emailHeading('VERIFY YOUR ACCOUNT', 1)}

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          Hello <strong>${v.username || 'Explorer'}</strong>,
        </p>

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          Thank you for creating an account on Heimursaga. To complete your registration and access the platform, please verify your email address.
        </p>

        ${emailInfoBox(
          `
          <strong style="display: block; margin-bottom: 4px;">VERIFICATION REQUIRED</strong>
          This link expires in <strong>${v.expiresInHours || 24} hours</strong>. You must verify your email before you can log in and start using the platform.
        `,
          'info',
        )}

        ${emailButton(verificationUrl, 'VERIFY EMAIL ADDRESS', 'primary')}

        <div style="font-size: 11px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4; font-family: monospace; word-break: break-all;">
          <strong style="display: block; margin-bottom: 8px; color: #202020; font-family: sans-serif;">MANUAL VERIFICATION LINK</strong>
          If the button doesn't work, copy this URL:
          <div style="margin-top: 8px; color: #4676ac;">
            ${verificationUrl}
          </div>
        </div>

        <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 16px; background-color: #fff7f0; border: 2px solid #ac6d46; line-height: 1.6;">
          <strong style="display: block; margin-bottom: 8px; color: #202020;">DIDN'T CREATE AN ACCOUNT?</strong>
          If you did not sign up for Heimursaga, you can safely ignore this email. No account will be created without verification.
        </div>

        <div style="font-size: 12px; color: #616161; margin-top: 16px; line-height: 1.6;">
          <strong style="color: #202020;">SECURITY NOTE:</strong>
          <br>
          Request time: ${new Date().toUTCString()}
          <br>
          This verification link can only be used once.
        </div>
      `);
      return emailWrapper(
        content,
        'Verify your Heimursaga account to get started',
        '',
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.EXPLORER_PRO_NEW_ENTRY,
    subject: (v: {
      creatorUsername?: string;
      explorerUsername?: string;
      postTitle?: string;
      entryTitle?: string;
    }) => `New journal entry from ${v.creatorUsername || v.explorerUsername}`,
    html: (
      v: {
        // Support both old and new prop names for compatibility
        creatorUsername?: string;
        explorerUsername?: string;
        postTitle?: string;
        entryTitle?: string;
        postContent?: string;
        entryContent?: string;
        postPlace?: string;
        postDate?: string;
        entryDate?: string;
        postJourney?: string;
        expeditionTitle?: string;
        postImages?: string[];
        photos?: Array<{ url: string; caption?: string }>;
        postUrl?: string;
        entryUrl?: string;
        unsubscribeUrl?: string;
        webViewUrl?: string;
        sponsored?: boolean;
        sponsorUsername?: string;
        sponsorshipTier?: string;
        sponsorshipAmount?: string;
        entryType?: string;
        entryNumber?: number;
        journalTitle?: string;
        expeditionProgress?: string;
        wordCount?: number;
        readTime?: string;
        tags?: string[];
      } = {},
    ) => {
      const explorerUsername =
        v.creatorUsername || v.explorerUsername || 'Explorer';
      const entryTitle = v.postTitle || v.entryTitle || 'New Entry';
      const entryContent = v.postContent || v.entryContent || '';
      const entryDate =
        v.postDate || v.entryDate || new Date().toLocaleDateString();
      const expedition = v.postJourney || v.expeditionTitle || '';
      const entryUrl = v.postUrl || v.entryUrl || `${APP_BASE_URL}/entry`;
      const unsubscribeUrl =
        v.unsubscribeUrl || `${APP_BASE_URL}/settings/notifications`;

      // Format content paragraphs
      const formattedContent = entryContent
        .replace(/\\\\n/g, '\n')
        .split('\n\n')
        .filter((p: string) => p.trim() !== '')
        .map((p: string) => `<p style="margin: 0 0 18px 0;">${p.trim()}</p>`)
        .join('');

      // Format images
      const images =
        v.postImages || (v.photos ? v.photos.map((p) => p.url) : []);
      const imagesHtml =
        images.length > 0
          ? `
        <div style="margin-bottom: 24px;">
          ${images.map((img: string) => `<img src="${img}" alt="Entry image" style="max-width: 100%; height: auto; display: block; border: 2px solid #202020; margin-bottom: 16px;">`).join('')}
        </div>
      `
          : '';

      const content = `
        ${emailSection(`
          ${emailHeading('SPONSORED JOURNAL ENTRY NOTIFICATION', 1)}

          ${emailInfoBox(
            `
            <strong>SPONSORSHIP DELIVERY</strong> • You are receiving this full journal entry because you are an active sponsor of this expedition.${v.sponsorshipTier ? ` This is a ${v.sponsorshipTier} tier sponsorship benefit.` : ''}
          `,
            'info',
          )}

          <div style="font-size: 12px; color: #616161; margin-bottom: 20px;">
            ${v.sponsorUsername ? `<strong>TO:</strong> @${v.sponsorUsername} (Sponsor)<br>` : ''}
            <strong>FROM:</strong> @${explorerUsername}<br>
            ${v.entryType ? `<strong>ENTRY TYPE:</strong> ${v.entryType.toUpperCase()}<br>` : ''}
            <strong>POSTED:</strong> ${entryDate}<br>
            ${v.entryNumber ? `<strong>ENTRY NUMBER:</strong> #${v.entryNumber}` : ''}
          </div>
        `)}

        ${emailDivider()}

        ${
          expedition || v.journalTitle
            ? emailSection(
                `
          <div style="font-size: 11px; color: #616161; margin-bottom: 8px; font-family: monospace;">
            EXPEDITION CONTEXT
          </div>
          ${emailDataTable([
            ...(expedition ? [{ label: 'EXPEDITION', value: expedition }] : []),
            ...(v.journalTitle
              ? [{ label: 'JOURNAL', value: v.journalTitle }]
              : []),
            ...(v.expeditionProgress
              ? [{ label: 'PROGRESS', value: v.expeditionProgress }]
              : []),
            ...(v.sponsorshipTier && v.sponsorshipAmount
              ? [
                  {
                    label: 'YOUR SPONSORSHIP',
                    value: `${v.sponsorshipTier} • ${v.sponsorshipAmount}`,
                  },
                ]
              : []),
          ])}
        `,
                '#f5f5f5',
              )
            : ''
        }

        ${emailSection(`
          <div style="border-left: 4px solid #ac6d46; padding-left: 16px; margin-bottom: 24px;">
            <div style="font-size: 24px; font-weight: bold; color: #202020; margin-bottom: 8px; line-height: 1.3;">
              ${entryTitle}${v.sponsored ? '<span style="background: #AA6C46; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 8px;">Sponsored</span>' : ''}
            </div>
            <div style="font-size: 11px; color: #616161; font-family: monospace; margin-bottom: 4px;">
              ${v.entryType ? `${v.entryType.toUpperCase()} ENTRY • ` : ''}${entryDate}
            </div>
            ${v.wordCount && v.readTime ? `<div style="font-size: 11px; color: #616161;">${v.wordCount} words • ${v.readTime} read time</div>` : ''}
          </div>

          <div style="font-size: 14px; line-height: 1.7; color: #202020; margin-bottom: 24px;">
            ${formattedContent}
          </div>

          ${imagesHtml}

          ${
            v.tags && v.tags.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <div style="font-size: 11px; color: #616161; margin-bottom: 8px;">TAGS:</div>
              <div>
                ${v.tags.map((tag: string) => `<span style="display: inline-block; background-color: #f5f5f5; border: 1px solid #b5bcc4; padding: 4px 10px; font-size: 11px; color: #202020; margin-right: 6px; margin-bottom: 6px; font-family: monospace;">#${tag}</span>`).join('')}
              </div>
            </div>
          `
              : ''
          }
        `)}

        ${emailDivider()}

        ${emailSection(
          `
          <div style="font-size: 11px; color: #616161; line-height: 1.6; margin-bottom: 16px;">
            <strong style="color: #202020;">SPONSORSHIP STATUS:</strong> Active • Your sponsorship makes this expedition possible.
          </div>

          ${emailButton(entryUrl, 'VIEW ENTRY ON PLATFORM', 'primary')}

          <div style="text-align: center; margin: 12px 0;">
            <a href="${entryUrl}" style="color: #4676ac; text-decoration: none; font-size: 13px; font-weight: bold;">View Full Entry</a>
          </div>
        `,
          '#f5f5f5',
        )}

        ${emailSection(`
          ${emailInfoBox(
            `
            <div style="font-size: 11px; line-height: 1.6;">
              <strong>SPONSORSHIP EMAIL PREFERENCES:</strong> You are receiving full journal entries via email because the explorer has enabled this feature for sponsors. You can manage your sponsorship notification preferences at any time from your account settings.
            </div>
          `,
            'info',
          )}
        `)}
      `;
      return emailWrapper(
        content,
        `New ${v.entryType || ''} entry from ${explorerUsername}: ${entryTitle}`,
        unsubscribeUrl,
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.ADMIN_NEW_USER_SIGNUP,
    subject: (v: { username: string; email: string }) =>
      `New user signup: ${v.username}`,
    html: (v: {
      username: string;
      email: string;
      signupDate: string;
      userProfileUrl?: string;
    }) => {
      const content = emailSection(`
        ${emailHeading('NEW USER SIGNUP', 1)}

        <p style="margin: 0 0 16px 0; line-height: 1.6;">
          A new user has signed up for Heimursaga.
        </p>

        ${emailDataTable([
          { label: 'USERNAME', value: v.username },
          { label: 'EMAIL', value: v.email },
          { label: 'SIGNUP DATE', value: v.signupDate },
        ])}

        ${v.userProfileUrl ? emailButton(v.userProfileUrl, 'VIEW USER PROFILE', 'primary') : ''}

        <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4;">
          This is an automated notification from the Heimursaga platform.
        </div>
      `);
      return emailWrapper(content, `New user signup: ${v.username}`);
    },
  },
  {
    key: EMAIL_TEMPLATES.NEW_ENTRY_NOTIFICATION,
    subject: (v: { authorUsername: string; entryTitle: string }) =>
      `${v.authorUsername} published: ${v.entryTitle}`,
    html: (v: {
      recipientUsername: string;
      authorUsername: string;
      entryTitle: string;
      entryType: string;
      expeditionName: string;
      entryId: string;
      excerpt?: string;
      coverImageUrl?: string;
      location?: string;
    }) => {
      const content = `
        ${emailSection(
          `
          <div style="font-size: 12px; font-weight: bold; color: #4676ac; margin-bottom: 8px; letter-spacing: 0.5px;">
            NEW JOURNAL ENTRY
          </div>
          ${emailHeading(`${v.authorUsername.toUpperCase()} PUBLISHED A NEW ENTRY`, 1)}
        `,
          '#f0f4f8',
        )}

        ${emailSection(`
          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Hello <strong>${v.recipientUsername}</strong>,
          </p>

          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            <strong>${v.authorUsername}</strong> published a new journal entry in <strong>${v.expeditionName}</strong>.
          </p>

          ${
            v.coverImageUrl
              ? `
            <div style="margin: 16px 0;">
              <img src="${v.coverImageUrl}" alt="Entry cover" style="width: 100%; height: auto; border: 2px solid #202020; display: block;">
            </div>
          `
              : ''
          }

          <div style="padding: 16px; background-color: #f5f5f5; border: 2px solid #202020; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: bold; color: #616161; margin-bottom: 8px; letter-spacing: 0.5px;">
              ${v.entryType.toUpperCase()}
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #202020; margin-bottom: 8px;">
              ${v.entryTitle}
            </div>
            ${v.location ? `<div style="font-size: 12px; color: #616161; margin-bottom: 8px;">Location: ${v.location}</div>` : ''}
            ${v.excerpt ? `<div style="font-size: 13px; color: #202020; line-height: 1.6; margin-top: 12px;">${v.excerpt}</div>` : ''}
          </div>

          ${emailButton(`${APP_BASE_URL}/entry/${v.entryId}`, 'READ ENTRY', 'primary')}
          ${emailButton(`${APP_BASE_URL}/explorer/${v.authorUsername}`, 'VIEW EXPLORER PROFILE', 'secondary')}

          <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4;">
            You're receiving this because you follow <strong>${v.authorUsername}</strong>. Manage your notification preferences in <a href="${APP_BASE_URL}/settings/notifications" style="color: #4676ac;">settings</a>.
          </div>
        `)}
      `;
      return emailWrapper(
        content,
        `${v.authorUsername} published: ${v.entryTitle}`,
        `${APP_BASE_URL}/settings/notifications`,
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.SPONSORSHIP_RECEIVED,
    subject: (v: {
      sponsorUsername: string;
      amount: number;
      currency: string;
    }) =>
      `You received a ${v.currency}${v.amount} sponsorship from ${v.sponsorUsername}`,
    html: (v: {
      recipientUsername: string;
      sponsorUsername: string;
      amount: number;
      currency: string;
      expeditionName: string;
      expeditionId: string;
      message?: string;
      processingFee: number;
      netAmount: number;
    }) => {
      const content = `
        ${emailSection(
          `
          <div style="font-size: 12px; font-weight: bold; color: #ac6d46; margin-bottom: 8px; letter-spacing: 0.5px;">
            SPONSORSHIP RECEIVED
          </div>
          ${emailHeading(`${v.currency}${v.amount.toFixed(2)} FROM ${v.sponsorUsername.toUpperCase()}`, 1)}
        `,
          '#fff7f0',
        )}

        ${emailSection(`
          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Hello <strong>${v.recipientUsername}</strong>,
          </p>

          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            You have received a sponsorship for your expedition <strong>${v.expeditionName}</strong>.
          </p>

          ${emailDataTable([
            { label: 'SPONSOR', value: v.sponsorUsername },
            { label: 'EXPEDITION', value: v.expeditionName },
            { label: 'AMOUNT', value: `${v.currency}${v.amount.toFixed(2)}` },
            {
              label: 'PROCESSING FEE',
              value: `${v.currency}${v.processingFee.toFixed(2)}`,
            },
            {
              label: 'NET AMOUNT',
              value: `${v.currency}${v.netAmount.toFixed(2)}`,
            },
            { label: 'DATE', value: new Date().toLocaleDateString() },
          ])}

          ${
            v.message
              ? emailInfoBox(
                  `
            <strong style="display: block; margin-bottom: 8px;">MESSAGE FROM SPONSOR:</strong>
            <div style="font-style: italic;">"${v.message}"</div>
          `,
                  'info',
                )
              : ''
          }

          ${emailButton(`${APP_BASE_URL}/expedition/${v.expeditionId}`, 'VIEW EXPEDITION', 'primary')}
          ${emailButton(`${APP_BASE_URL}/dashboard/sponsorships`, 'SPONSORSHIP DASHBOARD', 'secondary')}

          <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4; line-height: 1.6;">
            <strong style="display: block; margin-bottom: 4px; color: #202020;">PAYOUT INFORMATION</strong>
            Funds will be transferred to your connected payout method within 3-5 business days. View payout status in your <a href="${APP_BASE_URL}/settings/billing" style="color: #4676ac;">billing settings</a>.
          </div>
        `)}
      `;
      return emailWrapper(
        content,
        `You received a ${v.currency}${v.amount} sponsorship from ${v.sponsorUsername}`,
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.UPGRADE_CONFIRMATION,
    subject: 'Welcome to EXPLORER PRO',
    html: (v: {
      username: string;
      planName?: string;
      price: number;
      currency: string;
      billingPeriod: 'monthly' | 'annual';
      nextBillingDate: string;
    }) => {
      const content = `
        ${emailSection(
          `
          <div style="font-size: 12px; font-weight: bold; color: #ac6d46; margin-bottom: 8px; letter-spacing: 0.5px;">
            ACCOUNT UPGRADED
          </div>
          ${emailHeading('WELCOME TO EXPLORER PRO', 1)}
        `,
          '#fff7f0',
        )}

        ${emailSection(`
          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Hello <strong>${v.username}</strong>,
          </p>

          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Your account has been upgraded to <strong>${v.planName || 'EXPLORER PRO'}</strong>. All premium features are now active.
          </p>

          ${emailInfoBox(
            `
            <strong style="display: block; margin-bottom: 8px;">SUBSCRIPTION ACTIVE</strong>
            <div style="margin-bottom: 4px;">Plan: <strong>${v.planName || 'EXPLORER PRO'}</strong></div>
            <div style="margin-bottom: 4px;">Billing: <strong>${v.currency}${v.price.toFixed(2)} / ${v.billingPeriod}</strong></div>
            <div>Next billing date: <strong>${v.nextBillingDate}</strong></div>
          `,
            'success',
          )}

          ${emailHeading('EXPLORER PRO FEATURES', 2)}

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
            <tbody>
              <tr>
                <td style="padding-bottom: 12px;">
                  <div style="padding: 12px; background-color: #f5f5f5; border: 2px solid #202020;">
                    <strong style="font-size: 13px; color: #202020; display: block; margin-bottom: 4px;">SPONSORSHIP RECEPTION</strong>
                    <div style="font-size: 12px; color: #616161;">Receive financial support for your expeditions from other explorers and followers.</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px;">
                  <div style="padding: 12px; background-color: #f5f5f5; border: 2px solid #202020;">
                    <strong style="font-size: 13px; color: #202020; display: block; margin-bottom: 4px;">ADVANCED ANALYTICS</strong>
                    <div style="font-size: 12px; color: #616161;">Detailed insights into journal views, follower engagement, and sponsorship metrics.</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px;">
                  <div style="padding: 12px; background-color: #f5f5f5; border: 2px solid #202020;">
                    <strong style="font-size: 13px; color: #202020; display: block; margin-bottom: 4px;">PRIORITY SUPPORT</strong>
                    <div style="font-size: 12px; color: #616161;">Faster response times and dedicated assistance for platform questions.</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div style="padding: 12px; background-color: #f5f5f5; border: 2px solid #202020;">
                    <strong style="font-size: 13px; color: #202020; display: block; margin-bottom: 4px;">ENHANCED PROFILE</strong>
                    <div style="font-size: 12px; color: #616161;">EXPLORER PRO badge, featured placement, and increased profile visibility.</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          ${emailButton(`${APP_BASE_URL}/sponsorships/dashboard`, 'SETUP SPONSORSHIP RECEPTION', 'primary')}
          ${emailButton(`${APP_BASE_URL}/insights`, 'VIEW ANALYTICS', 'secondary')}

          <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4; line-height: 1.6;">
            <strong style="display: block; margin-bottom: 4px; color: #202020;">SUBSCRIPTION MANAGEMENT</strong>
            Manage your subscription, update payment methods, or cancel anytime in your <a href="${APP_BASE_URL}/settings/billing" style="color: #4676ac;">billing settings</a>.
          </div>
        `)}
      `;
      return emailWrapper(
        content,
        'Welcome to EXPLORER PRO - Premium features now active',
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.PAYMENT_RECEIPT,
    subject: (v: { receiptNumber: string; total: number; currency: string }) =>
      `Receipt ${v.receiptNumber} - ${v.currency}${v.total.toFixed(2)}`,
    html: (v: {
      username: string;
      receiptNumber: string;
      date: string;
      items: Array<{ description: string; amount: number }>;
      subtotal: number;
      tax?: number;
      total: number;
      currency: string;
      paymentMethod: string;
      billingAddress?: string;
    }) => {
      const content = `
        ${emailSection(
          `
          <div style="font-size: 12px; font-weight: bold; color: #616161; margin-bottom: 8px; letter-spacing: 0.5px;">
            PAYMENT RECEIPT
          </div>
          ${emailHeading(`${v.currency}${v.total.toFixed(2)} PAID`, 1)}
          <div style="font-size: 12px; color: #616161; font-family: monospace;">
            Receipt #${v.receiptNumber}
          </div>
        `,
          '#f5f5f5',
        )}

        ${emailSection(`
          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Hello <strong>${v.username}</strong>,
          </p>

          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Thank you for your payment. This receipt confirms your transaction on heimursaga.com.
          </p>

          ${emailHeading('TRANSACTION DETAILS', 2)}

          <table width="100%" cellpadding="12" cellspacing="0" border="0" style="border: 2px solid #202020; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="background-color: #202020; color: #ffffff;">
                <th align="left" style="padding: 12px; font-weight: bold; font-size: 11px; letter-spacing: 0.5px;">DESCRIPTION</th>
                <th align="right" style="padding: 12px; font-weight: bold; font-size: 11px; letter-spacing: 0.5px;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${v.items
                .map(
                  (item, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f5f5f5'};">
                  <td style="padding: 12px; color: #202020;">${item.description}</td>
                  <td align="right" style="padding: 12px; color: #202020; font-family: monospace;">${v.currency}${item.amount.toFixed(2)}</td>
                </tr>
              `,
                )
                .join('')}
              <tr style="border-top: 2px solid #b5bcc4;">
                <td align="right" style="padding: 12px; font-weight: bold; color: #616161; font-size: 11px;">SUBTOTAL</td>
                <td align="right" style="padding: 12px; font-weight: bold; font-family: monospace;">${v.currency}${v.subtotal.toFixed(2)}</td>
              </tr>
              ${
                v.tax !== undefined && v.tax > 0
                  ? `
                <tr>
                  <td align="right" style="padding: 12px; font-weight: bold; color: #616161; font-size: 11px;">TAX</td>
                  <td align="right" style="padding: 12px; font-weight: bold; font-family: monospace;">${v.currency}${v.tax.toFixed(2)}</td>
                </tr>
              `
                  : ''
              }
              <tr style="background-color: #202020; color: #ffffff;">
                <td align="right" style="padding: 12px; font-weight: bold; font-size: 12px; letter-spacing: 0.5px;">TOTAL PAID</td>
                <td align="right" style="padding: 12px; font-weight: bold; font-size: 16px; font-family: monospace;">${v.currency}${v.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${emailDataTable([
            { label: 'DATE', value: v.date },
            { label: 'RECEIPT NUMBER', value: v.receiptNumber },
            { label: 'PAYMENT METHOD', value: v.paymentMethod },
            ...(v.billingAddress
              ? [{ label: 'BILLING ADDRESS', value: v.billingAddress }]
              : []),
          ])}

          ${emailButton(`${APP_BASE_URL}/receipts/${v.receiptNumber}`, 'DOWNLOAD RECEIPT (PDF)', 'secondary')}

          <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4; line-height: 1.6;">
            <strong style="display: block; margin-bottom: 4px; color: #202020;">BILLING SUPPORT</strong>
            Questions about this transaction? Contact <a href="${APP_BASE_URL}/contact" style="color: #4676ac;">support</a> or view your <a href="${APP_BASE_URL}/settings/billing" style="color: #4676ac;">billing history</a>.
          </div>
        `)}
      `;
      return emailWrapper(
        content,
        `Receipt ${v.receiptNumber} - ${v.currency}${v.total.toFixed(2)}`,
      );
    },
  },
  {
    key: EMAIL_TEMPLATES.EXPEDITION_MILESTONE,
    subject: (v: { expeditionName: string; milestone: string }) => {
      const titles: Record<string, string> = {
        started: 'EXPEDITION STARTED',
        halfway: 'EXPEDITION MILESTONE: 50% COMPLETE',
        completed: 'EXPEDITION COMPLETED',
      };
      return `${titles[v.milestone] || 'EXPEDITION UPDATE'}: ${v.expeditionName}`;
    },
    html: (v: {
      username: string;
      expeditionName: string;
      expeditionId: string;
      milestone: 'started' | 'halfway' | 'completed';
      stats: {
        entriesPublished: number;
        totalDistance?: number;
        daysElapsed: number;
        sponsorshipsReceived?: number;
        totalSponsorshipAmount?: number;
      };
    }) => {
      const milestoneConfig: Record<
        string,
        { title: string; message: string; color: string }
      > = {
        started: {
          title: 'EXPEDITION STARTED',
          message:
            'Your expedition has officially begun. Safe travels and happy journaling.',
          color: '#4676ac',
        },
        halfway: {
          title: 'EXPEDITION MILESTONE: 50% COMPLETE',
          message:
            "You're halfway through your expedition. Keep documenting your journey.",
          color: '#ac6d46',
        },
        completed: {
          title: 'EXPEDITION COMPLETED',
          message:
            'Congratulations on completing your expedition. Your journal is now a permanent record of your journey.',
          color: '#4676ac',
        },
      };

      const config = milestoneConfig[v.milestone];
      const bgColor = v.milestone === 'halfway' ? '#fff7f0' : '#f0f4f8';

      const content = `
        ${emailSection(
          `
          <div style="font-size: 12px; font-weight: bold; color: ${config.color}; margin-bottom: 8px; letter-spacing: 0.5px;">
            ${config.title}
          </div>
          ${emailHeading(v.expeditionName.toUpperCase(), 1)}
        `,
          bgColor,
        )}

        ${emailSection(`
          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Hello <strong>${v.username}</strong>,
          </p>

          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            ${config.message}
          </p>

          ${
            v.milestone === 'completed'
              ? emailInfoBox(
                  `
            <strong style="display: block; margin-bottom: 4px;">EXPEDITION STATUS</strong>
            Your expedition is now marked as complete. All journal entries remain published and accessible to your followers.
          `,
                  'success',
                )
              : ''
          }

          ${emailHeading('EXPEDITION STATISTICS', 2)}

          ${emailDataTable([
            {
              label: 'ENTRIES PUBLISHED',
              value: v.stats.entriesPublished.toString(),
            },
            { label: 'DAYS ELAPSED', value: v.stats.daysElapsed.toString() },
            ...(v.stats.totalDistance
              ? [
                  {
                    label: 'TOTAL DISTANCE',
                    value: `${v.stats.totalDistance} km`,
                  },
                ]
              : []),
            ...(v.stats.sponsorshipsReceived
              ? [
                  {
                    label: 'SPONSORSHIPS',
                    value: v.stats.sponsorshipsReceived.toString(),
                  },
                ]
              : []),
            ...(v.stats.totalSponsorshipAmount
              ? [
                  {
                    label: 'TOTAL SUPPORT',
                    value: `$${v.stats.totalSponsorshipAmount.toFixed(2)}`,
                  },
                ]
              : []),
          ])}

          ${emailButton(`${APP_BASE_URL}/expedition/${v.expeditionId}`, 'VIEW EXPEDITION', 'primary')}

          ${
            v.milestone === 'completed'
              ? `
            ${emailButton(`${APP_BASE_URL}/expedition-builder`, 'PLAN NEXT EXPEDITION', 'secondary')}

            <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4; line-height: 1.6;">
              <strong style="display: block; margin-bottom: 4px; color: #202020;">WHAT'S NEXT?</strong>
              Share your completed expedition with your network, or start planning your next journey. Remember: you can have one active or planned expedition at a time.
            </div>
          `
              : ''
          }
        `)}
      `;
      return emailWrapper(content, `${config.title}: ${v.expeditionName}`);
    },
  },
  {
    key: EMAIL_TEMPLATES.MONTHLY_DIGEST,
    subject: (v: { month: string }) => `Your ${v.month} activity summary`,
    html: (v: {
      username: string;
      month: string;
      stats: {
        entriesPublished: number;
        totalViews: number;
        newFollowers: number;
        sponsorshipsReceived: number;
        sponsorshipsSent: number;
        totalSponsorshipReceived?: number;
      };
      topEntry?: {
        title: string;
        views: number;
        entryId: string;
      };
      activeExpedition?: {
        name: string;
        id: string;
        daysActive: number;
      };
    }) => {
      const content = `
        ${emailSection(
          `
          <div style="font-size: 12px; font-weight: bold; color: #4676ac; margin-bottom: 8px; letter-spacing: 0.5px;">
            MONTHLY ACTIVITY DIGEST
          </div>
          ${emailHeading(`${v.month.toUpperCase()} SUMMARY`, 1)}
        `,
          '#f0f4f8',
        )}

        ${emailSection(`
          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Hello <strong>${v.username}</strong>,
          </p>

          <p style="margin: 0 0 16px 0; line-height: 1.6;">
            Here's your monthly activity report for ${v.month}.
          </p>

          ${emailHeading('ACTIVITY STATISTICS', 2)}

          ${emailDataTable([
            {
              label: 'ENTRIES PUBLISHED',
              value: v.stats.entriesPublished.toString(),
            },
            {
              label: 'TOTAL VIEWS',
              value: v.stats.totalViews.toLocaleString(),
            },
            { label: 'NEW FOLLOWERS', value: v.stats.newFollowers.toString() },
            {
              label: 'SPONSORSHIPS RECEIVED',
              value: v.stats.sponsorshipsReceived.toString(),
            },
            {
              label: 'SPONSORSHIPS SENT',
              value: v.stats.sponsorshipsSent.toString(),
            },
            ...(v.stats.totalSponsorshipReceived
              ? [
                  {
                    label: 'TOTAL SUPPORT RECEIVED',
                    value: `$${v.stats.totalSponsorshipReceived.toFixed(2)}`,
                  },
                ]
              : []),
          ])}

          ${
            v.topEntry
              ? `
            ${emailHeading('TOP PERFORMING ENTRY', 2)}

            <div style="padding: 16px; background-color: #f5f5f5; border: 2px solid #202020; margin-bottom: 16px;">
              <div style="font-size: 16px; font-weight: bold; color: #202020; margin-bottom: 8px;">
                ${v.topEntry.title}
              </div>
              <div style="font-size: 13px; color: #616161;">
                ${v.topEntry.views.toLocaleString()} views this month
              </div>
            </div>

            ${emailButton(`${APP_BASE_URL}/entry/${v.topEntry.entryId}`, 'VIEW ENTRY', 'secondary')}
          `
              : ''
          }

          ${
            v.activeExpedition
              ? `
            ${emailHeading('ACTIVE EXPEDITION', 2)}

            <div style="padding: 16px; background-color: #fff7f0; border: 2px solid #ac6d46; margin-bottom: 16px;">
              <div style="font-size: 16px; font-weight: bold; color: #202020; margin-bottom: 8px;">
                ${v.activeExpedition.name}
              </div>
              <div style="font-size: 13px; color: #616161;">
                Active for ${v.activeExpedition.daysActive} days
              </div>
            </div>

            ${emailButton(`${APP_BASE_URL}/expedition/${v.activeExpedition.id}`, 'VIEW EXPEDITION', 'primary')}
          `
              : ''
          }

          ${
            v.stats.entriesPublished === 0
              ? `
            <div style="font-size: 13px; color: #616161; margin-top: 24px; padding: 16px; background-color: #f5f5f5; border: 1px solid #b5bcc4; line-height: 1.6;">
              <strong style="display: block; margin-bottom: 8px; color: #202020;">NO ENTRIES THIS MONTH</strong>
              You haven't published any journal entries in ${v.month}. Start documenting your experiences to keep your followers engaged.
              <div style="margin-top: 12px;">
                <a href="${APP_BASE_URL}/entries/new" style="color: #4676ac; font-weight: bold;">Create Entry →</a>
              </div>
            </div>
          `
              : ''
          }

          <div style="font-size: 12px; color: #616161; margin-top: 24px; padding: 12px; background-color: #f5f5f5; border: 1px solid #b5bcc4;">
            View detailed analytics in your <a href="${APP_BASE_URL}/insights" style="color: #4676ac;">insights dashboard</a>. Manage digest preferences in <a href="${APP_BASE_URL}/settings/notifications" style="color: #4676ac;">notification settings</a>.
          </div>
        `)}
      `;
      return emailWrapper(
        content,
        `Your ${v.month} activity summary on heimursaga.com`,
        `${APP_BASE_URL}/settings/notifications`,
      );
    },
  },
];

export const getEmailTemplate = <T = any>(
  key: string,
  vars?: T,
): { subject: string; html: string } | null => {
  const template = templates.find((t) => t.key === key);
  if (!template) return null;

  const html = template.html(vars);
  const subject =
    typeof template.subject === 'function'
      ? template.subject(vars)
      : template.subject;

  return {
    subject,
    html,
  };
};
