// Basic input validation utilities for mobile app security

export const validation = {
  email: {
    isValid: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    message: 'Please enter a valid email address',
  },

  password: {
    isValid: (password: string): boolean => {
      // Minimum 8 characters, at least one letter and one number
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
      return passwordRegex.test(password);
    },
    message: 'Password must be at least 8 characters with letters and numbers',
  },

  username: {
    isValid: (username: string): boolean => {
      // 3-20 characters, alphanumeric and underscores only
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      return usernameRegex.test(username);
    },
    message: 'Username must be 3-20 characters, letters, numbers and underscores only',
  },

  required: {
    isValid: (value: string): boolean => {
      return value.trim().length > 0;
    },
    message: 'This field is required',
  },

  postTitle: {
    isValid: (title: string): boolean => {
      return title.trim().length >= 3 && title.length <= 100;
    },
    message: 'Title must be between 3 and 100 characters',
  },

  postContent: {
    isValid: (content: string): boolean => {
      return content.trim().length >= 10 && content.length <= 5000;
    },
    message: 'Content must be between 10 and 5000 characters',
  },

  // Sanitize user input to prevent basic injection attempts
  sanitizeInput: (input: string): string => {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  },

  // Basic length validation
  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },
};

// Form validation helper
export interface ValidationRule {
  validator: (value: string) => boolean;
  message: string;
}

export const validateField = (value: string, rules: ValidationRule[]): string | null => {
  for (const rule of rules) {
    if (!rule.validator(value)) {
      return rule.message;
    }
  }
  return null;
};

// Common validation rule sets
export const validationRules = {
  loginEmail: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.email.isValid, message: validation.email.message },
  ],
  
  loginPassword: [
    { validator: validation.required.isValid, message: validation.required.message },
  ],
  
  signupEmail: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.email.isValid, message: validation.email.message },
  ],
  
  signupUsername: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.username.isValid, message: validation.username.message },
  ],
  
  signupPassword: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.password.isValid, message: validation.password.message },
  ],
  
  postTitle: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.postTitle.isValid, message: validation.postTitle.message },
  ],
  
  postContent: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.postContent.isValid, message: validation.postContent.message },
  ],
};