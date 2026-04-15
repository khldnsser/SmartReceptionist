import { google } from 'googleapis';
import { config } from '../config';

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    config.google.gmail.clientId,
    config.google.gmail.clientSecret,
  );

  oauth2Client.setCredentials({
    refresh_token: config.google.gmail.refreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Sends a plain-text confirmation email on behalf of the clinic.
 */
export async function sendConfirmationEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ messageId: string }> {
  const gmail = getGmailClient();

  const rawMessage = buildRawMessage({
    from: config.google.gmail.sender,
    to,
    subject,
    body,
  });

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: rawMessage },
  });

  return { messageId: response.data.id ?? '' };
}

function buildRawMessage(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    opts.body,
  ];

  return Buffer.from(lines.join('\r\n')).toString('base64url');
}
