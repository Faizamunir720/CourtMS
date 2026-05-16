# Seed Data Record — Court Case Management System

**Run seed:** `npm run seed` (from project root)  
**Re-run:** Safe — removes all `@courtms.pk` users and related data first.

---

## Default password (all seed accounts)

| Password |
|----------|
| `CourtMS@123` |

---

## Login credentials by role

### Admin

| Name | Email | Role |
|------|-------|------|
| Fatima Khan | admin@courtms.pk | admin |

### Clerks (use Admin portal at `/admin`)

| Name | Email | Role |
|------|-------|------|
| Hassan Raza | clerk@courtms.pk | clerk |
| Ayesha Malik | clerk2@courtms.pk | clerk |

### Judges

| Name | Email | Role |
|------|-------|------|
| Justice Muhammad Aslam | judge.aslam@courtms.pk | judge |
| Justice Rabia Siddiqui | judge.siddiqui@courtms.pk | judge |
| Justice Imran Hussain | judge.hussain@courtms.pk | judge |
| Justice Sana Tariq | judge.tariq@courtms.pk | judge |
| Justice Khurram Ali | judge.ali@courtms.pk | judge |

### Lawyers

| Name | Email | Role |
|------|-------|------|
| Barrister Ahmad Hassan | lawyer.hassan@courtms.pk | lawyer |
| Advocate Zainab Qureshi | lawyer.qureshi@courtms.pk | lawyer |
| Advocate Bilal Ahmed | lawyer.ahmed@courtms.pk | lawyer |
| Advocate Mariam Shah | lawyer.shah@courtms.pk | lawyer |
| Advocate Usman Farooq | lawyer.farooq@courtms.pk | lawyer |
| Advocate Hira Naseem | lawyer.naseem@courtms.pk | lawyer |
| Advocate Faisal Iqbal | lawyer.iqbal@courtms.pk | lawyer |
| Advocate Nadia Rizvi | lawyer.rizvi@courtms.pk | lawyer |

### Citizens

| Name | Email | Role |
|------|-------|------|
| Muhammad Tariq Butt | citizen.butt@courtms.pk | citizen |
| Sadia Noor | citizen.noor@courtms.pk | citizen |
| Kamran Sheikh | citizen.sheikh@courtms.pk | citizen |
| Amina Bibi | citizen.bibi@courtms.pk | citizen |
| Rashid Mahmood | citizen.mahmood@courtms.pk | citizen |
| Hina Javed | citizen.javed@courtms.pk | citizen |
| Arif Hussain | citizen.hussain@courtms.pk | citizen |
| Noreen Akhtar | citizen.akhtar@courtms.pk | citizen |
| Shahid Mehmood | citizen.mehmood@courtms.pk | citizen |
| Rubina Kausar | citizen.kausar@courtms.pk | citizen |
| Imtiaz Gill | citizen.gill@courtms.pk | citizen |
| Saima Parveen | citizen.parveen@courtms.pk | citizen |

---

## Quick test logins

| Portal | Email | Password |
|--------|-------|----------|
| Admin | admin@courtms.pk | CourtMS@123 |
| Clerk | clerk@courtms.pk | CourtMS@123 |
| Judge | judge.aslam@courtms.pk | CourtMS@123 |
| Lawyer | lawyer.hassan@courtms.pk | CourtMS@123 |
| Citizen | citizen.butt@courtms.pk | CourtMS@123 |

**App URL:** http://localhost:5000/login

---

## Seeded data counts (approximate)

| Collection | Count |
|------------|-------|
| Users | 28 |
| Cases | 35 |
| Hearings | ~70+ (2–3 per assigned case) |
| Documents | ~100+ (2–4 per case) |
| Notifications | ~5–8 per user |
| Complaints | 12 (one per citizen) |
| Audit logs | 40 |

---

## Case list (Pakistani context)

| Case # | Title | Type | Status |
|--------|-------|------|--------|
| LHC-2024-001 | Property Dispute — Gulberg Plot | civil | Ongoing |
| SHC-2024-002 | Cheque Dishonour under Section 489-F | criminal | Ongoing |
| IHC-2024-003 | Rent Dispute — F-10 Flat | civil | Pending |
| PHC-2024-004 | Inheritance — Hayatabad Ancestral Home | civil | Ongoing |
| LHC-2024-005 | Commercial Contract Breach — Textile Export | commercial | Closed |
| LHC-2024-006 | Family Maintenance — Minor Children | civil | Ongoing |
| MUL-2024-007 | Land Encroachment — Multan Agricultural Plot | civil | Pending |
| SHC-2024-008 | Defamation — Social Media Posts | civil | Ongoing |
| LHC-2024-009 | Murder Trial — Session Court Lahore | criminal | Ongoing |
| IHC-2024-010 | Service Tribunal — Federal Employee Promotion | civil | Pending |
| LHC-2024-011 | Khula Petition — DHA Family Court | civil | Ongoing |
| SHC-2024-012 | Partnership Dissolution — Clifton Business | commercial | Closed |
| IHC-2024-013 | Eviction — G-11 Rental Property | civil | Ongoing |
| LHC-2024-014 | NAB Reference — Misuse of Public Office | criminal | Ongoing |
| SHC-2024-015 | Insurance Claim — Vehicle Accident M-9 | commercial | Pending |
| LHC-2024-016 | Labour Court — Unfair Dismissal | civil | Ongoing |
| PHC-2024-017 | Tribal Land Dispute — KPK | civil | Pending |
| LHC-2024-018 | Copyright — Fashion Design Piracy | commercial | Ongoing |
| IHC-2024-019 | Constitutional Petition — Article 199 | civil | Ongoing |
| SHC-2024-020 | Anti-Terrorism Court — Lyari Operation | criminal | Ongoing |
| LHC-2024-021 | Succession Certificate — Bank Accounts | civil | Closed |
| MUL-2024-022 | Water Share Dispute — Canal Area | civil | Ongoing |
| LHC-2024-023 | Builder Delay — Bahria Town Apartment | commercial | Pending |
| SHC-2024-024 | Harassment at Workplace — IT Company | civil | Ongoing |
| IHC-2024-025 | Tax Appeal — FBR Assessment | commercial | Ongoing |
| LHC-2024-026 | Guardianship — Minor Orphan | civil | Pending |
| SHC-2024-027 | Smuggling — Customs Appraisement | criminal | Ongoing |
| LHC-2024-028 | Medical Negligence — Mayo Hospital | civil | Ongoing |
| PHC-2024-029 | FATA Merger — Property Rights | civil | Closed |
| LHC-2024-030 | School Fee Dispute — Private School Lahore | civil | Pending |
| SHC-2024-031 | Maritime Claim — Port Qasim Cargo | commercial | Ongoing |
| IHC-2024-032 | PEMRA Fine Challenge — TV Channel | commercial | Ongoing |
| LHC-2024-033 | Bail Application — Session Court | criminal | Ongoing |
| LHC-2024-034 | Waqf Property Administration | civil | Pending |
| SHC-2024-035 | Trade Mark Infringement — Basmati Rice Brand | commercial | Ongoing |

---

## Hearing locations used

- Court Room 1, Lahore High Court  
- Court Room 4, Sindh High Court Karachi  
- Family Court, Islamabad  
- Session Court, Peshawar  
- Civil Court, Multan  
- Anti-Terrorism Court, Karachi  
- Labour Court, Lahore  
- Commercial Court, Rawalpindi  

---

## Document categories seeded

`petition`, `evidence`, `judgment`, `notice`, `report`, `other`

Sample files: `plaint_petition.pdf`, `affidavit_applicant.pdf`, `vakalatnama.pdf`, `final_judgment.pdf`, etc.

---

*Generated for project demo and viva preparation.*
