import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, type Styles,
} from '@react-pdf/renderer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfClient {
  name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
}

export interface PdfAllergy {
  substance: string;
  reaction: string;
  severity: string;
  notes: string | null;
}

export interface PdfProblem {
  problem: string;
  icd10_code: string | null;
  status: string;
  onset_date: string | null;
}

export interface PdfMedication {
  drug_name: string;
  dose: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  indication: string | null;
}

export interface PdfSummary {
  appointment_date: string | null;
  created_at: string;
  diagnosis: string | null;
  notes: string | null;
  treatment: string | null;
  follow_up: string | null;
  signed_at: string | null;
}

export interface PdfVitals {
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  o2_saturation: number | null;
  captured_at: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1d1d1f',
    padding: '40 48 48 48',
    lineHeight: 1.5,
  },
  // Header
  header: { marginBottom: 24, paddingBottom: 16, borderBottom: '1.5 solid #0066cc' },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0066cc', marginBottom: 4 },
  headerSub: { fontSize: 10, color: '#6e6e73' },
  headerMeta: { fontSize: 9, color: '#aeaeb2', marginTop: 4 },
  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1d1d1f', marginBottom: 8, paddingBottom: 4, borderBottom: '0.5 solid #e0e0e0', textTransform: 'uppercase', letterSpacing: 0.6 },
  // Row / grid
  row: { flexDirection: 'row', marginBottom: 4 },
  col2: { flex: 1, paddingRight: 12 },
  // Field
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  value: { fontSize: 10, color: '#1d1d1f' },
  // Table-like rows
  dataRow: { flexDirection: 'row', padding: '6 0', borderBottom: '0.5 solid #f0f0f0' },
  dataCell: { flex: 1, paddingRight: 8 },
  dataCellName: { flex: 2, paddingRight: 8 },
  dataLabel: { fontSize: 8, color: '#aeaeb2', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  dataValue: { fontSize: 10, color: '#1d1d1f' },
  // Summary card
  summaryCard: { padding: '10 12', border: '0.5 solid #e0e0e0', borderRadius: 4, marginBottom: 8 },
  summaryDate: { fontSize: 9, color: '#0066cc', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  summaryFieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#aeaeb2', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2, marginTop: 6 },
  summaryText: { fontSize: 10, color: '#1d1d1f' },
  signedBadge: { fontSize: 8, color: '#15803d', fontFamily: 'Helvetica-Bold' },
  // Vitals grid
  vitalBox: { flex: 1, padding: '8 10', border: '0.5 solid #e0e0e0', borderRadius: 4, margin: 2, alignItems: 'center' },
  vitalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1d1d1f' },
  vitalUnit: { fontSize: 8, color: '#aeaeb2' },
  vitalLabel: { fontSize: 8, color: '#6e6e73', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
  // Empty
  empty: { fontSize: 10, color: '#aeaeb2', fontStyle: 'italic' },
  // Severity
  severeBadge: { fontSize: 8, color: '#b91c1c', fontFamily: 'Helvetica-Bold' },
  moderateBadge: { fontSize: 8, color: '#c2410c', fontFamily: 'Helvetica-Bold' },
  mildBadge: { fontSize: 8, color: '#166534', fontFamily: 'Helvetica-Bold' },
  // Footer
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, borderTop: '0.5 solid #e0e0e0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#aeaeb2' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDatetime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Beirut', month: 'short', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function SeverityText({ severity }: { severity: string }) {
  const styleMap: Record<string, Styles[string]> = {
    severe: s.severeBadge,
    moderate: s.moderateBadge,
    mild: s.mildBadge,
  };
  return <Text style={styleMap[severity] ?? s.mildBadge}>{severity.toUpperCase()}</Text>;
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function ProfileSection({ client }: { client: PdfClient }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Patient information</Text>
      <View style={s.row}>
        <View style={s.col2}>
          <Text style={s.label}>Full name</Text>
          <Text style={s.value}>{client.name ?? '—'}</Text>
        </View>
        <View style={s.col2}>
          <Text style={s.label}>Age</Text>
          <Text style={s.value}>{client.age ? `${client.age} years` : '—'}</Text>
        </View>
        <View style={s.col2}>
          <Text style={s.label}>Email</Text>
          <Text style={s.value}>{client.email ?? '—'}</Text>
        </View>
        <View style={s.col2}>
          <Text style={s.label}>Phone</Text>
          <Text style={s.value}>{client.phone ?? '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function AllergiesSection({ allergies }: { allergies: PdfAllergy[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Allergies</Text>
      {allergies.length === 0
        ? <Text style={s.empty}>No known allergies.</Text>
        : allergies.map((a, i) => (
          <View key={i} style={s.dataRow}>
            <View style={s.dataCellName}>
              <Text style={s.dataValue}>{a.substance}</Text>
              <Text style={s.dataLabel}>{a.reaction}</Text>
            </View>
            <View style={s.dataCell}>
              <SeverityText severity={a.severity} />
            </View>
            {a.notes && (
              <View style={s.dataCell}>
                <Text style={[s.dataValue, { color: '#6e6e73' }]}>{a.notes}</Text>
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

function ProblemsSection({ problems }: { problems: PdfProblem[] }) {
  const active = problems.filter(p => p.status === 'active');
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Active problems</Text>
      {active.length === 0
        ? <Text style={s.empty}>No active problems recorded.</Text>
        : active.map((p, i) => (
          <View key={i} style={s.dataRow}>
            <View style={s.dataCellName}>
              <Text style={s.dataValue}>{p.problem}</Text>
              {p.onset_date && <Text style={s.dataLabel}>Since {fmtDate(p.onset_date)}</Text>}
            </View>
            {p.icd10_code && (
              <View style={s.dataCell}>
                <Text style={s.dataLabel}>ICD-10</Text>
                <Text style={s.dataValue}>{p.icd10_code}</Text>
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

function MedicationsSection({ medications }: { medications: PdfMedication[] }) {
  const active = medications.filter(m => !m.end_date);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Current medications</Text>
      {active.length === 0
        ? <Text style={s.empty}>No active medications.</Text>
        : active.map((m, i) => (
          <View key={i} style={s.dataRow}>
            <View style={s.dataCellName}>
              <Text style={s.dataValue}>{m.drug_name}</Text>
              {m.indication && <Text style={s.dataLabel}>{m.indication}</Text>}
            </View>
            <View style={s.dataCell}>
              <Text style={s.dataValue}>{m.dose}</Text>
            </View>
            <View style={s.dataCell}>
              <Text style={s.dataValue}>{m.frequency}</Text>
            </View>
            <View style={s.dataCell}>
              <Text style={s.dataLabel}>Since {fmtDate(m.start_date)}</Text>
            </View>
          </View>
        ))}
    </View>
  );
}

function VitalsSection({ vitals }: { vitals: PdfVitals | null }) {
  if (!vitals) return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Vital signs</Text>
      <Text style={s.empty}>No vital signs recorded.</Text>
    </View>
  );

  const items = [
    { label: 'BP', value: vitals.systolic_bp && vitals.diastolic_bp ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : null, unit: 'mmHg' },
    { label: 'HR', value: vitals.heart_rate, unit: 'bpm' },
    { label: 'Temp', value: vitals.temperature_c, unit: '°C' },
    { label: 'Weight', value: vitals.weight_kg, unit: 'kg' },
    { label: 'Height', value: vitals.height_cm, unit: 'cm' },
    { label: 'BMI', value: vitals.bmi, unit: '' },
    { label: 'O₂ Sat', value: vitals.o2_saturation, unit: '%' },
  ].filter(i => i.value !== null);

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Vital signs — {fmtDatetime(vitals.captured_at)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map(({ label, value, unit }) => (
          <View key={label} style={s.vitalBox}>
            <Text style={s.vitalLabel}>{label}</Text>
            <Text style={s.vitalValue}>{String(value)}</Text>
            {unit ? <Text style={s.vitalUnit}>{unit}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function SummariesSection({ summaries }: { summaries: PdfSummary[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Recent visit summaries (last {summaries.length})</Text>
      {summaries.length === 0
        ? <Text style={s.empty}>No visit summaries recorded.</Text>
        : summaries.map((summary, i) => (
          <View key={i} style={s.summaryCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={s.summaryDate}>
                {summary.appointment_date ? fmtDatetime(summary.appointment_date) : fmtDate(summary.created_at)}
              </Text>
              {summary.signed_at && (
                <Text style={s.signedBadge}>✓ Signed {fmtDate(summary.signed_at)}</Text>
              )}
            </View>
            {summary.diagnosis && (
              <>
                <Text style={s.summaryFieldLabel}>Diagnosis</Text>
                <Text style={s.summaryText}>{summary.diagnosis}</Text>
              </>
            )}
            {summary.notes && (
              <>
                <Text style={s.summaryFieldLabel}>Notes</Text>
                <Text style={s.summaryText}>{summary.notes}</Text>
              </>
            )}
            {summary.treatment && (
              <>
                <Text style={s.summaryFieldLabel}>Treatment</Text>
                <Text style={s.summaryText}>{summary.treatment}</Text>
              </>
            )}
            {summary.follow_up && (
              <>
                <Text style={s.summaryFieldLabel}>Follow-up</Text>
                <Text style={s.summaryText}>{summary.follow_up}</Text>
              </>
            )}
          </View>
        ))}
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

interface PatientPdfProps {
  client: PdfClient;
  allergies: PdfAllergy[];
  problems: PdfProblem[];
  medications: PdfMedication[];
  vitals: PdfVitals | null;
  summaries: PdfSummary[];
  exportedAt: string;
}

export function PatientPdfDocument({
  client, allergies, problems, medications, vitals, summaries, exportedAt,
}: PatientPdfProps) {
  return (
    <Document title={`${client.name ?? 'Patient'} — Medical Record`} author="Clinic PMS">
      <Page size="A4" style={s.page}>
        {/* Page header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{client.name ?? 'Patient record'}</Text>
          <Text style={s.headerSub}>Medical record export</Text>
          <Text style={s.headerMeta}>Generated {exportedAt} · Confidential</Text>
        </View>

        <ProfileSection    client={client} />
        <AllergiesSection  allergies={allergies} />
        <ProblemsSection   problems={problems} />
        <MedicationsSection medications={medications} />
        <VitalsSection     vitals={vitals} />
        <SummariesSection  summaries={summaries} />

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{client.name ?? 'Patient'} — Confidential medical record</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
