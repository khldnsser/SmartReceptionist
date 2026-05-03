/**
 * Privacy boundary for the WhatsApp AI agent.
 *
 * The agent is read-only with one exception: patients may upload test results.
 * The PMS (web app) is the only place clinical data is created or edited by the doctor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🟢 PATIENT-FACING — agent MAY return to the patient who owns the record
 * ─────────────────────────────────────────────────────────────────────────────
 * clients          : name, phone, email, age
 * client_allergies : substance, reaction  (NOT severity, notes)
 * client_medications (active only, end_date IS NULL)
 *                  : drug_name, dose, frequency  (NOT indication, notes)
 * client_problems  (active only, status = 'active')
 *                  : problem text  (NOT icd10_code, notes)
 * client_family_history
 *                  : relation, condition  (NOT notes)
 * client_social_history
 *                  : smoking_status, alcohol_status, drug_use_status,
 *                    occupation, living_situation  (NOT detail free-text fields)
 * appointments     : own appointments only (already scoped by wa_id)
 * test_results     : file_name, created_at, patient_note
 *                    (NOT doctor_label, doctor_note, file contents)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 DOCTOR-ONLY — agent must NEVER expose
 * ─────────────────────────────────────────────────────────────────────────────
 * visit_summaries          — ALL fields (diagnosis, notes, treatment, follow_up)
 * visit_summary_addendums  — ALL fields
 * visit_vital_signs        — ALL fields (BP, HR, weight, BMI, temp, O2 sat)
 * client_allergies         : severity, notes
 * client_medications       : non-active rows, indication, notes
 * client_problems          : icd10_code, notes, resolved/inactive rows
 * client_family_history    : notes
 * client_social_history    : free-text detail fields
 * test_results             : doctor_label, doctor_note, file contents
 * audit_logs               — ALL fields
 * clients.medical_history  — legacy blob, replaced by structured tables
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforcement
 * ─────────────────────────────────────────────────────────────────────────────
 * Privacy is enforced at the DB query level in src/db/clinical.ts — only the
 * patient-facing columns are selected. The system prompt reinforces these rules
 * at the LLM level as a second line of defence.
 *
 * All clinical reads via agent tools write an audit_logs row (actor_source='agent').
 * Implemented in src/agent/tools/clinical.ts.
 */

export const PRIVACY_POLICY = {
  patientFacing: [
    'clients: name, phone, email, age',
    'client_allergies: substance, reaction',
    'client_medications (active): drug_name, dose, frequency',
    'client_problems (active): problem',
    'client_family_history: relation, condition',
    'client_social_history: smoking_status, alcohol_status, drug_use_status, occupation, living_situation',
    'appointments: own only',
    'test_results: file_name, created_at, patient_note',
  ],
  doctorOnly: [
    'visit_summaries (all)',
    'visit_summary_addendums (all)',
    'visit_vital_signs (all)',
    'client_allergies: severity, notes',
    'client_medications: inactive rows, indication, notes',
    'client_problems: icd10_code, notes, inactive/resolved rows',
    'client_family_history: notes',
    'client_social_history: detail fields',
    'test_results: doctor_label, doctor_note, file contents',
    'audit_logs (all)',
    'clients.medical_history',
  ],
} as const;
