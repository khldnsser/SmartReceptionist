import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { config } from '../config';

export interface Patient {
  email: string;
  name: string;
  phone: string;
  timeZone: string;
  appointmentDate: string;
  bookingStatus: 'confirmed' | 'cancelled' | '';
  intakeForm: string;
  reminderSent: boolean;
}

// Canonical column order in the Google Sheet
const COLUMNS = [
  'Email',
  'Name',
  'Phone',
  'Time Zone',
  'Appointment Date',
  'Booking Status',
  'Intake Form',
  'Reminder Sent',
] as const;

function getAuth(): JWT {
  const key = config.google.serviceAccountKey as {
    client_email: string;
    private_key: string;
  };
  return new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function range(rows?: string): string {
  const base = `${config.google.sheetName}!A:H`;
  return rows ? `${config.google.sheetName}!${rows}` : base;
}

function rowToPatient(row: string[]): Patient {
  return {
    email: row[0] ?? '',
    name: row[1] ?? '',
    phone: row[2] ?? '',
    timeZone: row[3] ?? '',
    appointmentDate: row[4] ?? '',
    bookingStatus: (row[5] as Patient['bookingStatus']) ?? '',
    intakeForm: row[6] ?? '',
    reminderSent: (row[7] ?? '').toLowerCase() === 'true',
  };
}

function patientToRow(p: Partial<Patient>, base?: string[]): string[] {
  const row = base ? [...base] : Array(8).fill('');
  if (p.email !== undefined) row[0] = p.email;
  if (p.name !== undefined) row[1] = p.name;
  if (p.phone !== undefined) row[2] = p.phone;
  if (p.timeZone !== undefined) row[3] = p.timeZone;
  if (p.appointmentDate !== undefined) row[4] = p.appointmentDate;
  if (p.bookingStatus !== undefined) row[5] = p.bookingStatus;
  if (p.intakeForm !== undefined) row[6] = p.intakeForm;
  if (p.reminderSent !== undefined) row[7] = String(p.reminderSent);
  return row;
}

/**
 * Returns all patient rows from the sheet (skips the header row).
 */
export async function readAllRows(): Promise<Patient[]> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: range(),
  });

  const rows = response.data.values ?? [];
  // Row 0 is the header — skip it
  return rows.slice(1).map(rowToPatient);
}

/**
 * Finds a patient record by email. Returns null if not found.
 */
export async function findByEmail(email: string): Promise<Patient | null> {
  const all = await readAllRows();
  return all.find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null;
}

/**
 * Appends a new patient row with the given email (all other fields left blank).
 */
export async function addRow(email: string): Promise<Patient> {
  const sheets = getSheets();
  const row = patientToRow({ email });

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.google.sheetId,
    range: range(),
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  return rowToPatient(row);
}

/**
 * Updates an existing patient row matched by email.
 * Only the fields provided in `fields` are overwritten.
 */
export async function updateRow(
  email: string,
  fields: Partial<Omit<Patient, 'email'>>,
): Promise<Patient> {
  const sheets = getSheets();

  // Read the full sheet to find the row index
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: range(),
  });

  const rows = response.data.values ?? [];
  // Row 0 is header; data rows start at index 1 (spreadsheet row 2)
  const dataIndex = rows
    .slice(1)
    .findIndex((r) => (r[0] ?? '').toLowerCase() === email.toLowerCase());

  if (dataIndex === -1) {
    throw new Error(`Patient with email "${email}" not found in sheet`);
  }

  const spreadsheetRowIndex = dataIndex + 2; // +1 for header, +1 for 1-based indexing
  const existingRow = rows[dataIndex + 1];
  const updatedRow = patientToRow({ email, ...fields }, existingRow);

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.google.sheetId,
    range: `${config.google.sheetName}!A${spreadsheetRowIndex}:H${spreadsheetRowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  });

  return rowToPatient(updatedRow);
}

// Re-export column metadata for reference
export { COLUMNS };
