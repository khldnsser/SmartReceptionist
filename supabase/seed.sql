-- ============================================================
-- seed.sql  –  Dummy data for development and testing
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Clients ──────────────────────────────────────────────────
insert into clients (id, wa_id, email, name, phone, age, medical_history) values
(
  'a1000000-0000-0000-0000-000000000001',
  '96170000001',
  'nour.khalil@gmail.com',
  'Nour Khalil',
  '96170000001',
  34,
  'Type 2 diabetes (well-controlled). Seasonal allergies. No known drug allergies.'
),
(
  'a1000000-0000-0000-0000-000000000002',
  '96171000002',
  'karim.nassar@outlook.com',
  'Karim Nassar',
  '96171000002',
  52,
  'Hypertension — on lisinopril 10mg. Occasional lower back pain. Ex-smoker (quit 2019).'
),
(
  'a1000000-0000-0000-0000-000000000003',
  '96176000003',
  'lara.haddad@gmail.com',
  'Lara Haddad',
  '96176000003',
  28,
  'Mild anxiety. Vitamin D deficiency. No chronic conditions.'
),
(
  'a1000000-0000-0000-0000-000000000004',
  '96178000004',
  'georges.azar@yahoo.com',
  'Georges Azar',
  '96178000004',
  61,
  'High cholesterol — on rosuvastatin. Previous knee surgery (2018). Penicillin allergy.'
)
on conflict (wa_id) do nothing;


-- ── Appointments ─────────────────────────────────────────────
insert into appointments (id, client_id, appointment_date, booking_status, intake_form, reminder_sent) values

-- Nour Khalil
(
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  (now() at time zone 'Asia/Beirut')::date + interval '2 days' + interval '10 hours',
  'booked',
  'Follow-up on blood sugar levels and HbA1c results',
  false
),
(
  'b1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  (now() at time zone 'Asia/Beirut')::date - interval '30 days' + interval '9 hours 30 minutes',
  'completed',
  'Annual check-up and allergy review',
  true
),

-- Karim Nassar
(
  'b1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000002',
  (now() at time zone 'Asia/Beirut')::date + interval '5 days' + interval '14 hours',
  'booked',
  'Blood pressure review and medication adjustment',
  false
),
(
  'b1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000002',
  (now() at time zone 'Asia/Beirut')::date - interval '15 days' + interval '11 hours',
  'completed',
  'Back pain follow-up',
  true
),
(
  'b1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000002',
  (now() at time zone 'Asia/Beirut')::date - interval '60 days' + interval '10 hours',
  'cancelled',
  'Routine check',
  false
),

-- Lara Haddad
(
  'b1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000003',
  (now() at time zone 'Asia/Beirut')::date + interval '1 day' + interval '9 hours',
  'booked',
  'Anxiety management and vitamin D follow-up',
  false
),
(
  'b1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000003',
  (now() at time zone 'Asia/Beirut')::date - interval '45 days' + interval '13 hours 30 minutes',
  'completed',
  'Initial consultation',
  true
),

-- Georges Azar
(
  'b1000000-0000-0000-0000-000000000008',
  'a1000000-0000-0000-0000-000000000004',
  (now() at time zone 'Asia/Beirut')::date - interval '7 days' + interval '10 hours 30 minutes',
  'completed',
  'Cholesterol panel review and knee pain',
  true
)

on conflict (id) do nothing;


-- ── Visit Summaries ───────────────────────────────────────────
insert into visit_summaries (client_id, appointment_id, diagnosis, notes, treatment, follow_up) values
(
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'Type 2 diabetes — stable. Mild seasonal allergic rhinitis.',
  'HbA1c at 6.8% — within target range. Patient reports good dietary compliance. Allergy symptoms mild this season.',
  'Continue metformin 500mg twice daily. Cetirizine 10mg as needed for allergies.',
  'Repeat HbA1c in 3 months. Return sooner if symptoms worsen.'
),
(
  'a1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000004',
  'Chronic lower back pain — musculoskeletal origin. Hypertension stable.',
  'BP reading 128/82 — well controlled on current medication. Back pain rated 4/10, improves with movement. No neurological deficits.',
  'Continue lisinopril 10mg. Physiotherapy referral for back pain. Ibuprofen 400mg PRN (max 5 days).',
  'Review BP in 6 weeks. Follow up on physiotherapy progress.'
),
(
  'a1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000007',
  'Generalised anxiety disorder (mild). Vitamin D deficiency.',
  'Patient reports difficulty sleeping and occasional palpitations — likely anxiety-related. Vitamin D level 18 ng/mL (deficient). No other findings on exam.',
  'Vitamin D3 5000 IU daily for 8 weeks, then maintenance dose. Discussed sleep hygiene and breathing exercises. Referral to therapist.',
  'Recheck Vitamin D in 8 weeks. Follow up on anxiety symptoms and therapy progress.'
),
(
  'a1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000008',
  'Hypercholesterolaemia — improving. Knee osteoarthritis (mild).',
  'LDL down from 168 to 134 mg/dL — good response to statin. Knee shows mild crepitus on flexion, no effusion. X-ray reviewed: mild joint space narrowing consistent with early OA.',
  'Continue rosuvastatin 10mg. Glucosamine 1500mg daily. Weight management advice given.',
  'Lipid panel in 3 months. Orthopaedic referral if knee pain worsens.'
)
on conflict do nothing;


-- ── Test Results (metadata only — no actual files) ────────────
insert into test_results (client_id, storage_path, mime_type, file_name, doctor_label, patient_note, uploaded_via) values
(
  'a1000000-0000-0000-0000-000000000001',
  '96170000001/sample_hba1c.pdf',
  'application/pdf',
  'HbA1c_Results_March.pdf',
  'HbA1c — March 2025',
  'My blood test results from the lab',
  'whatsapp'
),
(
  'a1000000-0000-0000-0000-000000000002',
  '96171000002/sample_lipid.pdf',
  'application/pdf',
  'Lipid_Panel_April.pdf',
  'Lipid panel — April 2025',
  'cholesterol results',
  'whatsapp'
),
(
  'a1000000-0000-0000-0000-000000000003',
  '96176000003/sample_vitd.jpg',
  'image/jpeg',
  'VitD_Result.jpg',
  'Vitamin D — Jan 2025',
  'vitamin d test',
  'whatsapp'
),
(
  'a1000000-0000-0000-0000-000000000004',
  '96178000004/sample_xray.pdf',
  'application/pdf',
  'Knee_Xray_Report.pdf',
  'Knee X-ray report',
  'knee xray from the hospital',
  'whatsapp'
)
on conflict do nothing;


-- ── Conversation messages (sample history for Nour Khalil) ────
insert into conversation_messages (wa_id, role, content) values
('96170000001', 'user', 'Hi, I would like to book an appointment'),
('96170000001', 'assistant', 'Hello Nour! Welcome back. Of course — what would you like to discuss during your appointment?'),
('96170000001', 'user', 'I want to check my blood sugar results'),
('96170000001', 'assistant', 'Got it. Do you have a preferred day, or shall I suggest the next available slots?'),
('96170000001', 'user', 'Next available please'),
('96170000001', 'assistant', 'Here are the next available slots: Monday 12 May at 10:00 AM, Monday 12 May at 11:30 AM, Tuesday 13 May at 9:00 AM, Tuesday 13 May at 2:00 PM, Wednesday 14 May at 9:30 AM. Which works best?')
on conflict do nothing;
