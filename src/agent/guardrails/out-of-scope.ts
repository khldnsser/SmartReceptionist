const EMERGENCY_PATTERN =
  /\b(emergency|heart attack|stroke|unconscious|overdose|ambulance|call 112|call 911|dying|not breathing)\b/i;

export function checkOutOfScope(input: string): string | null {
  if (EMERGENCY_PATTERN.test(input)) {
    return "If this is a medical emergency, please call 112 or go to the nearest emergency room immediately. For appointment scheduling, message us when you're safe.";
  }
  return null;
}
