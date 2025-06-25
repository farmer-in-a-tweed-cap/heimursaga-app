export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
};

const templates: { key: string; subject: string; html: (v?: any) => string }[] =
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
  ];

export const getEmailTemplate = <T = any>(
  key: string,
  vars?: T,
): { subject: string; html: string } => {
  const template = templates.find((t) => t.key === key);
  if (!template) return null;

  const html = template.html(vars);

  return {
    subject: template.subject,
    html,
  };
};
