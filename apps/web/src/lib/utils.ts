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

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const debounce = <T = any, R = void>(fn: (args: T) => R, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, args: T) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.call(this, args), ms);
  };
};
