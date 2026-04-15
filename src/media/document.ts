import * as XLSX from 'xlsx';

export type DocumentResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'unsupported' };

/**
 * Extracts plain text content from a document buffer based on its MIME type.
 * Returns { ok: false } for unsupported types.
 */
export async function extractDocument(
  buffer: Buffer,
  mimeType: string,
  caption?: string,
): Promise<DocumentResult> {
  const normalized = normalizeMimeType(mimeType);
  let content: string;

  try {
    content = await extractContent(buffer, normalized);
  } catch {
    return { ok: false, reason: 'unsupported' };
  }

  const text = [
    `Parsed text: ${content}`,
    `Caption text: ${caption ?? ''}`,
    `MimeType: ${mimeType}`,
  ].join('\n');

  return { ok: true, text };
}

async function extractContent(buffer: Buffer, mimeType: string): Promise<string> {
  // Plain text types — decode directly
  if (
    mimeType === 'text/csv' ||
    mimeType === 'text/html' ||
    mimeType === 'text/calendar' ||
    mimeType === 'text/rtf' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/xml' ||
    mimeType === 'application/xml' ||
    mimeType === 'application/json'
  ) {
    return buffer.toString('utf8');
  }

  // PDF
  if (mimeType === 'application/pdf') {
    // Dynamic import to avoid startup cost
    const pdfParse = await import('pdf-parse').then((m) => m.default);
    const data = await pdfParse(buffer);
    return data.text;
  }

  // Excel (legacy .xls)
  if (mimeType === 'application/vnd.ms-excel') {
    return xlsxBufferToText(buffer);
  }

  // Excel (.xlsx)
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return xlsxBufferToText(buffer);
  }

  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

function xlsxBufferToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    return XLSX.utils.sheet_to_csv(ws);
  });
  return sheets.join('\n\n');
}

/**
 * Normalizes ambiguous MIME types to canonical values used for routing.
 */
function normalizeMimeType(mimeType: string): string {
  if (
    mimeType === 'text/calendar' ||
    mimeType === 'application/ics' ||
    mimeType === 'text/x-calendar'
  ) {
    return 'text/calendar';
  }
  if (mimeType === 'application/xml' || mimeType === 'text/xml') {
    return 'application/xml';
  }
  return mimeType;
}
