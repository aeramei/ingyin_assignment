export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4
  strength: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  errors: string[];
  suggestions: string[];
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  blacklist?: string[];
}

// Common weak passwords to blacklist
const COMMON_PASSWORDS = [
  "password",
  "123456",
  "12345678",
  "123456789",
  "12345",
  "qwerty",
  "abc123",
  "password1",
  "admin",
  "welcome",
  "letmein",
  "monkey",
  "sunshine",
  "master",
  "hello",
];

export const defaultRequirements: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  blacklist: COMMON_PASSWORDS,
};

export function validatePassword(
  password: string,
  requirements: PasswordRequirements = defaultRequirements,
  userInfo?: { email?: string; name?: string; company?: string }
): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(
      `Password must be at least ${requirements.minLength} characters long`
    );
  } else {
    score += 1;
  }

  // Check uppercase
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Include at least one uppercase letter (A-Z)");
  } else if (requirements.requireUppercase) {
    score += 1;
  }

  // Check lowercase
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Include at least one lowercase letter (a-z)");
  } else if (requirements.requireLowercase) {
    score += 1;
  }

  // Check numbers
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push("Include at least one number (0-9)");
  } else if (requirements.requireNumbers) {
    score += 1;
  }

  // Check special characters
  if (
    requirements.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Include at least one special character (!@#$%^&* etc.)");
  } else if (requirements.requireSpecialChars) {
    score += 1;
  }

  // Check against common passwords
  if (
    requirements.blacklist &&
    requirements.blacklist.includes(password.toLowerCase())
  ) {
    errors.push("This password is too common and easily guessable");
    score = 0;
  }

  // Check for personal information
  if (userInfo) {
    const lowerPassword = password.toLowerCase();
    if (
      userInfo.email &&
      lowerPassword.includes(userInfo.email.split("@")[0].toLowerCase())
    ) {
      errors.push("Password should not contain your email address");
      score = Math.max(0, score - 1);
    }
    if (userInfo.name && lowerPassword.includes(userInfo.name.toLowerCase())) {
      errors.push("Password should not contain your name");
      score = Math.max(0, score - 1);
    }
    if (
      userInfo.company &&
      lowerPassword.includes(userInfo.company.toLowerCase())
    ) {
      errors.push("Password should not contain your company name");
      score = Math.max(0, score - 1);
    }
  }

  // Calculate strength based on score
  let strength: PasswordValidationResult["strength"] = "Very Weak";
  if (score >= 4) strength = "Very Strong";
  else if (score >= 3) strength = "Strong";
  else if (score >= 2) strength = "Medium";
  else if (score >= 1) strength = "Weak";

  // Add suggestions for improvement
  if (score < 4) {
    if (password.length < 12) {
      suggestions.push("Use a longer password (12+ characters)");
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) {
      suggestions.push(
        "Combine uppercase, lowercase, numbers, and special characters"
      );
    }
    if (password.length < 16) {
      suggestions.push("Consider using a passphrase instead of a password");
    }
  }

  const isValid = errors.length === 0 && score >= 3; // At least "Strong"

  return {
    isValid,
    score,
    strength,
    errors,
    suggestions,
  };
}

// Real-time strength checker for UI
export function getPasswordStrength(password: string): {
  strength: string;
  color: string;
  width: string;
} {
  if (!password)
    return { strength: "Very Weak", color: "bg-red-500", width: "0%" };

  const validation = validatePassword(password, {
    ...defaultRequirements,
    minLength: 1, // Override for real-time feedback
  });

  const strengthMap = {
    "Very Weak": { color: "bg-red-500", width: "20%" },
    Weak: { color: "bg-orange-500", width: "40%" },
    Medium: { color: "bg-yellow-500", width: "60%" },
    Strong: { color: "bg-green-500", width: "80%" },
    "Very Strong": { color: "bg-emerald-500", width: "100%" },
  };

  return {
    strength: validation.strength,
    ...strengthMap[validation.strength],
  };
}
