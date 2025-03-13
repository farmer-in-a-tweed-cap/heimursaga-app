export const array = (length: number) => Array.from(Array(length));

export const fieldmsg = {
  required: (field: string) => `${field} is required`,
  min: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  max: (field: string, max: number) =>
    `${field} must be less than ${max} characters`,
  nonempty: (field: string) => `${field} cannot be empty`,
  email: () => `invalid email format`,
};

export const redirect = (href: string) => {
  window.location.href = href;
};
