import { DateTime } from 'luxon';
import { config } from '../../core/config';
import { IDENTITY_OPENING, CORE_RULES_SECTION } from './sections/identity';
import { TOOLS_REF_SECTION } from './sections/tools-ref';
import { FLOWS_SECTION } from './sections/flows';
import { BUSINESS_RULES_SECTION } from './sections/business-rules';

export function buildSystemPrompt(): string {
  const now = DateTime.now().setZone(config.business.timezone);
  const currentDateTime = now.toFormat("EEEE, MMMM d, yyyy 'at' HH:mm ZZZZ");

  return [
    IDENTITY_OPENING,
    '---',
    `## Current Date & Time\n${currentDateTime}`,
    '---',
    CORE_RULES_SECTION,
    '---',
    TOOLS_REF_SECTION,
    '---',
    FLOWS_SECTION,
    '---',
    BUSINESS_RULES_SECTION,
  ].join('\n\n');
}
