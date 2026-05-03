import { checkOutOfScope } from './out-of-scope';

export interface GuardrailResult {
  action: 'pass' | 'block';
  response?: string;
}

export function runGuardrails(input: string): GuardrailResult {
  const outOfScope = checkOutOfScope(input);
  if (outOfScope) {
    return { action: 'block', response: outOfScope };
  }
  return { action: 'pass' };
}
