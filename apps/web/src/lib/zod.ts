export const zodMessage = {
  required: (field: string) => `${field} is required`,
  nonempty: (field: string) => `${field} cannot be empty`,
  number: {
    invalid: (field: string) => `${field} must be a number`,
    max: (field: string, max: number) => `${field} must be less than ${max}`,
    min: (field: string, min: number) => `${field} must be at least ${min}`,
    positive: (field: string) => `${field} must be a positive number`,
  },
  string: {
    invalid: (field: string) => `${field} must be a string`,
    min: (field: string, min: number) =>
      `${field} must be at least ${min} characters`,
    max: (field: string, max: number) =>
      `${field} must be less than ${max} characters`,
  },
  email: () => `invalid email format`,
};
