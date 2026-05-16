/**
 * Database seed — Pakistani court context dummy data.
 * Run: npm run seed
 * Re-run safe: removes prior @courtms.pk seed data first.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Case = require('../models/Case');
const Hearing = require('../models/Hearing');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');

const SEED_PASSWORD = 'CourtMS@123';
const SEED_DOMAIN = '@courtms.pk';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pick(arr, i) {
  return arr[i % arr.length];
}

const USERS = [
  { name: 'Fatima Khan', email: 'admin@courtms.pk', role: 'admin', phone: '0300-1110001', nationalId: '35202-1111111-1', address: 'District Courts, Lahore' },
  { name: 'Hassan Raza', email: 'clerk@courtms.pk', role: 'clerk', phone: '0300-1110002', nationalId: '35202-2222222-2', address: 'Registry Office, Lahore High Court' },
  { name: 'Ayesha Malik', email: 'clerk2@courtms.pk', role: 'clerk', phone: '0300-1110003', nationalId: '35202-3333333-3', address: 'Civil Registry, Islamabad' },
  { name: 'Justice Muhammad Aslam', email: 'judge.aslam@courtms.pk', role: 'judge', phone: '0300-2220001', nationalId: '35202-4444444-4', address: 'Lahore High Court' },
  { name: 'Justice Rabia Siddiqui', email: 'judge.siddiqui@courtms.pk', role: 'judge', phone: '0300-2220002', nationalId: '35202-5555555-5', address: 'Sindh High Court, Karachi' },
  { name: 'Justice Imran Hussain', email: 'judge.hussain@courtms.pk', role: 'judge', phone: '0300-2220003', nationalId: '35202-6666666-6', address: 'Islamabad District Court' },
  { name: 'Justice Sana Tariq', email: 'judge.tariq@courtms.pk', role: 'judge', phone: '0300-2220004', nationalId: '35202-7777777-7', address: 'Peshawar High Court' },
  { name: 'Justice Khurram Ali', email: 'judge.ali@courtms.pk', role: 'judge', phone: '0300-2220005', nationalId: '35202-8888888-8', address: 'Multan Bench, LHC' },
  { name: 'Barrister Ahmad Hassan', email: 'lawyer.hassan@courtms.pk', role: 'lawyer', phone: '0300-3330001', nationalId: '35202-1010101-1', address: 'Chamber 12, District Bar, Lahore' },
  { name: 'Advocate Zainab Qureshi', email: 'lawyer.qureshi@courtms.pk', role: 'lawyer', phone: '0300-3330002', nationalId: '35202-2020202-2', address: 'Sindh Bar Association, Karachi' },
  { name: 'Advocate Bilal Ahmed', email: 'lawyer.ahmed@courtms.pk', role: 'lawyer', phone: '0300-3330003', nationalId: '35202-3030303-3', address: 'Islamabad Bar Council' },
  { name: 'Advocate Mariam Shah', email: 'lawyer.shah@courtms.pk', role: 'lawyer', phone: '0300-3330004', nationalId: '35202-4040404-4', address: 'Rawalpindi District Courts' },
  { name: 'Advocate Usman Farooq', email: 'lawyer.farooq@courtms.pk', role: 'lawyer', phone: '0300-3330005', nationalId: '35202-5050505-5', address: 'Faisalabad Bar Room 8' },
  { name: 'Advocate Hira Naseem', email: 'lawyer.naseem@courtms.pk', role: 'lawyer', phone: '0300-3330006', nationalId: '35202-6060606-6', address: 'Lahore High Court Bar' },
  { name: 'Advocate Faisal Iqbal', email: 'lawyer.iqbal@courtms.pk', role: 'lawyer', phone: '0300-3330007', nationalId: '35202-7070707-7', address: 'Hyderabad District Courts' },
  { name: 'Advocate Nadia Rizvi', email: 'lawyer.rizvi@courtms.pk', role: 'lawyer', phone: '0300-3330008', nationalId: '35202-8080808-8', address: 'Quetta Bar Association' },
  { name: 'Muhammad Tariq Butt', email: 'citizen.butt@courtms.pk', role: 'citizen', phone: '0300-4440001', nationalId: '35202-9090909-9', address: 'Gulberg III, Lahore' },
  { name: 'Sadia Noor', email: 'citizen.noor@courtms.pk', role: 'citizen', phone: '0300-4440002', nationalId: '35202-1212121-2', address: 'Clifton, Karachi' },
  { name: 'Kamran Sheikh', email: 'citizen.sheikh@courtms.pk', role: 'citizen', phone: '0300-4440003', nationalId: '35202-1313131-3', address: 'F-10, Islamabad' },
  { name: 'Amina Bibi', email: 'citizen.bibi@courtms.pk', role: 'citizen', phone: '0300-4440004', nationalId: '35202-1414141-4', address: 'Hayatabad, Peshawar' },
  { name: 'Rashid Mahmood', email: 'citizen.mahmood@courtms.pk', role: 'citizen', phone: '0300-4440005', nationalId: '35202-1515151-5', address: 'Satiana Road, Faisalabad' },
  { name: 'Hina Javed', email: 'citizen.javed@courtms.pk', role: 'citizen', phone: '0300-4440006', nationalId: '35202-1616161-6', address: 'Bahria Town, Rawalpindi' },
  { name: 'Arif Hussain', email: 'citizen.hussain@courtms.pk', role: 'citizen', phone: '0300-4440007', nationalId: '35202-1717171-7', address: 'Model Town, Multan' },
  { name: 'Noreen Akhtar', email: 'citizen.akhtar@courtms.pk', role: 'citizen', phone: '0300-4440008', nationalId: '35202-1818181-8', address: 'Saddar, Hyderabad' },
  { name: 'Shahid Mehmood', email: 'citizen.mehmood@courtms.pk', role: 'citizen', phone: '0300-4440009', nationalId: '35202-1919191-9', address: 'Jinnah Town, Quetta' },
  { name: 'Rubina Kausar', email: 'citizen.kausar@courtms.pk', role: 'citizen', phone: '0300-4440010', nationalId: '35202-2020202-0', address: 'DHA Phase 5, Lahore' },
  { name: 'Imtiaz Gill', email: 'citizen.gill@courtms.pk', role: 'citizen', phone: '0300-4440011', nationalId: '35202-2121212-1', address: 'North Nazimabad, Karachi' },
  { name: 'Saima Parveen', email: 'citizen.parveen@courtms.pk', role: 'citizen', phone: '0300-4440012', nationalId: '35202-2323232-3', address: 'G-11, Islamabad' },
];

const CASE_TEMPLATES = [
  { num: 'LHC-2024-001', title: 'Property Dispute — Gulberg Plot', type: 'civil', applicant: 'Muhammad Tariq Butt', respondent: 'Habib Bank Ltd', status: 'Ongoing' },
  { num: 'SHC-2024-002', title: 'Cheque Dishonour under Section 489-F', type: 'criminal', applicant: 'Sadia Noor', respondent: 'Ali Traders Karachi', status: 'Ongoing' },
  { num: 'IHC-2024-003', title: 'Rent Dispute — F-10 Flat', type: 'civil', applicant: 'Kamran Sheikh', respondent: 'Capital Estate Agency', status: 'Pending' },
  { num: 'PHC-2024-004', title: 'Inheritance — Hayatabad Ancestral Home', type: 'civil', applicant: 'Amina Bibi', respondent: 'Brothers of Amina Bibi', status: 'Ongoing' },
  { num: 'LHC-2024-005', title: 'Commercial Contract Breach — Textile Export', type: 'commercial', applicant: 'Rashid Mahmood', respondent: 'Orient Fabrics Ltd', status: 'Closed' },
  { num: 'LHC-2024-006', title: 'Family Maintenance — Minor Children', type: 'civil', applicant: 'Hina Javed', respondent: 'Javed Iqbal', status: 'Ongoing' },
  { num: 'MUL-2024-007', title: 'Land Encroachment — Multan Agricultural Plot', type: 'civil', applicant: 'Arif Hussain', respondent: 'Punjab Land Revenue Dept', status: 'Pending' },
  { num: 'SHC-2024-008', title: 'Defamation — Social Media Posts', type: 'civil', applicant: 'Noreen Akhtar', respondent: 'Digital Media Pvt Ltd', status: 'Ongoing' },
  { num: 'LHC-2024-009', title: 'Murder Trial — Session Court Lahore', type: 'criminal', applicant: 'State of Punjab', respondent: 'Accused: Waseem Khan', status: 'Ongoing' },
  { num: 'IHC-2024-010', title: 'Service Tribunal — Federal Employee Promotion', type: 'civil', applicant: 'Shahid Mehmood', respondent: 'Establishment Division', status: 'Pending' },
  { num: 'LHC-2024-011', title: 'Khula Petition — DHA Family Court', type: 'civil', applicant: 'Rubina Kausar', respondent: 'Asad Kausar', status: 'Ongoing' },
  { num: 'SHC-2024-012', title: 'Partnership Dissolution — Clifton Business', type: 'commercial', applicant: 'Imtiaz Gill', respondent: 'S.K. Partners', status: 'Closed' },
  { num: 'IHC-2024-013', title: 'Eviction — G-11 Rental Property', type: 'civil', applicant: 'Saima Parveen', respondent: 'Tenant: Bilal Hussain', status: 'Ongoing' },
  { num: 'LHC-2024-014', title: 'NAB Reference — Misuse of Public Office', type: 'criminal', applicant: 'NAB Lahore', respondent: 'Former Director LDA', status: 'Ongoing' },
  { num: 'SHC-2024-015', title: 'Insurance Claim — Vehicle Accident M-9', type: 'commercial', applicant: 'Sadia Noor', respondent: 'EFU General Insurance', status: 'Pending' },
  { num: 'LHC-2024-016', title: 'Labour Court — Unfair Dismissal Ferozepur Road Factory', type: 'civil', applicant: 'Workers Union Lahore', respondent: 'Metro Textile Mills', status: 'Ongoing' },
  { num: 'PHC-2024-017', title: 'Tribal Land Dispute — KPK Border Area', type: 'civil', applicant: 'Amina Bibi', respondent: 'Cousin Malik Saeed', status: 'Pending' },
  { num: 'LHC-2024-018', title: 'Copyright — Fashion Design Piracy', type: 'commercial', applicant: 'Hina Javed', respondent: 'Style House Boutique', status: 'Ongoing' },
  { num: 'IHC-2024-019', title: 'Constitutional Petition — Article 199', type: 'civil', applicant: 'Kamran Sheikh', respondent: 'Federation of Pakistan', status: 'Ongoing' },
  { num: 'SHC-2024-020', title: 'Anti-Terrorism Court — Lyari Operation', type: 'criminal', applicant: 'State', respondent: 'Accused Gang Members', status: 'Ongoing' },
  { num: 'LHC-2024-021', title: 'Succession Certificate — Bank Accounts', type: 'civil', applicant: 'Muhammad Tariq Butt', respondent: 'UBL Bank Ltd', status: 'Closed' },
  { num: 'MUL-2024-022', title: 'Water Share Dispute — Canal Command Area', type: 'civil', applicant: 'Arif Hussain', respondent: 'Neighbouring Farmers Union', status: 'Ongoing' },
  { num: 'LHC-2024-023', title: 'Builder Delay — Bahria Town Apartment', type: 'commercial', applicant: 'Rubina Kausar', respondent: 'Bahria Developers', status: 'Pending' },
  { num: 'SHC-2024-024', title: 'Harassment at Workplace — IT Company', type: 'civil', applicant: 'Noreen Akhtar', respondent: 'TechVenture Solutions', status: 'Ongoing' },
  { num: 'IHC-2024-025', title: 'Tax Appeal — FBR Assessment', type: 'commercial', applicant: 'Imtiaz Gill', respondent: 'Federal Board of Revenue', status: 'Ongoing' },
  { num: 'LHC-2024-026', title: 'Guardianship — Minor Orphan', type: 'civil', applicant: 'Saima Parveen', respondent: 'Uncle Riaz Ahmed', status: 'Pending' },
  { num: 'SHC-2024-027', title: 'Smuggling — Customs Appraisement', type: 'criminal', applicant: 'Collector Customs', respondent: 'Import Firm Al-Makkah', status: 'Ongoing' },
  { num: 'LHC-2024-028', title: 'Medical Negligence — Mayo Hospital', type: 'civil', applicant: 'Rashid Mahmood', respondent: 'Dr. Saeed & Mayo Hospital', status: 'Ongoing' },
  { num: 'PHC-2024-029', title: 'FATA Merger — Property Rights', type: 'civil', applicant: 'Shahid Mehmood', respondent: 'Provincial Government KPK', status: 'Closed' },
  { num: 'LHC-2024-030', title: 'School Fee Dispute — Private School Lahore', type: 'civil', applicant: 'Hina Javed', respondent: 'Beaconhouse School System', status: 'Pending' },
  { num: 'SHC-2024-031', title: 'Maritime Claim — Port Qasim Cargo', type: 'commercial', applicant: 'Orient Fabrics Ltd', respondent: 'Port Qasim Authority', status: 'Ongoing' },
  { num: 'IHC-2024-032', title: 'PEMRA Fine Challenge — TV Channel', type: 'commercial', applicant: 'Digital Media Pvt Ltd', respondent: 'PEMRA Islamabad', status: 'Ongoing' },
  { num: 'LHC-2024-033', title: 'Bail Application — Session Court', type: 'criminal', applicant: 'Advocate for Accused', respondent: 'State of Punjab', status: 'Ongoing' },
  { num: 'LHC-2024-034', title: 'Waqf Property Administration', type: 'civil', applicant: 'Muhammad Tariq Butt', respondent: 'Auqaf Department Punjab', status: 'Pending' },
  { num: 'SHC-2024-035', title: 'Trade Mark Infringement — Basmati Rice Brand', type: 'commercial', applicant: 'Rashid Mahmood', respondent: 'Fake Rice Exporters', status: 'Ongoing' },
];

const LOCATIONS = [
  'Court Room 1, Lahore High Court',
  'Court Room 4, Sindh High Court Karachi',
  'Family Court, Islamabad',
  'Session Court, Peshawar',
  'Civil Court, Multan',
  'Anti-Terrorism Court, Karachi',
  'Labour Court, Lahore',
  'Commercial Court, Rawalpindi',
];

const COMPLAINT_SUBJECTS = [
  'Delay in case hearing schedule',
  'Difficulty accessing uploaded documents',
  'Incorrect case status displayed',
  'Request for Urdu translation of court order',
  'Clerk office not responding to queries',
  'Need updated hearing date notification',
  'Wrong lawyer assigned in portal',
  'Missing document in case file',
  'Request for case progress update',
  'Portal login issues for family member',
];

async function clearSeedData() {
  const seedUsers = await User.find({ email: { $regex: /@courtms\.pk$/i } }).select('_id');
  const ids = seedUsers.map((u) => u._id);
  if (ids.length === 0) return;
  const cases = await Case.find({ $or: [{ lawyerId: { $in: ids } }, { citizenId: { $in: ids } }] }).select('_id');
  const caseIds = cases.map((c) => c._id);
  await Promise.all([
    AuditLog.deleteMany({ userId: { $in: ids } }),
    Notification.deleteMany({ userId: { $in: ids } }),
    Complaint.deleteMany({ submittedBy: { $in: ids } }),
    Document.deleteMany({ $or: [{ uploadedBy: { $in: ids } }, { caseId: { $in: caseIds } }] }),
    Hearing.deleteMany({ $or: [{ judgeId: { $in: ids } }, { caseId: { $in: caseIds } }] }),
    Case.deleteMany({ _id: { $in: caseIds } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  console.log('Cleared previous seed data.');
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/court-case-manager';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await clearSeedData();

  // insertMany skips User pre-save hook — hash passwords manually
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const userDocs = await User.insertMany(
    USERS.map((u) => ({ ...u, password: passwordHash, isActive: true }))
  );

  const byRole = (role) => userDocs.filter((u) => u.role === role);
  const byEmail = (email) => userDocs.find((u) => u.email === email);

  const admins = byRole('admin');
  const clerks = byRole('clerk');
  const judges = byRole('judge');
  const lawyers = byRole('lawyer');
  const citizens = byRole('citizen');

  const caseRecords = [];
  for (let i = 0; i < CASE_TEMPLATES.length; i++) {
    const t = CASE_TEMPLATES[i];
    const lawyer = pick(lawyers, i);
    const judge = t.status !== 'Pending' ? pick(judges, i) : null;
    const citizen = pick(citizens, i);
    caseRecords.push({
      caseNumber: t.num,
      title: t.title,
      description: `${t.title}. Filed at Pakistani district/high court. Parties seek relief under applicable civil/criminal procedure. Matter involves local jurisdiction and Urdu/English court record.`,
      applicant: t.applicant,
      respondent: t.respondent,
      caseType: t.type,
      status: t.status,
      filedDate: daysFromNow(-90 + i * 2),
      lawyerId: lawyer._id,
      assignedJudgeId: judge?._id || null,
      citizenId: citizen._id,
    });
  }

  const insertedCases = await Case.insertMany(caseRecords);

  const hearingRecords = [];
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];
  let hIdx = 0;
  for (let i = 0; i < insertedCases.length; i++) {
    const c = insertedCases[i];
    if (!c.assignedJudgeId) continue;
    const count = c.status === 'Closed' ? 2 : 3;
    for (let j = 0; j < count; j++) {
      const dayOffset = c.status === 'Closed' ? -30 + j * 14 : -7 + j * 12 + (i % 5);
      let status = 'Scheduled';
      let outcome = '';
      let notes = '';
      if (c.status === 'Closed' && j === count - 1) {
        status = 'Completed';
        outcome = 'Case disposed of. Final order announced in favour of applicant.';
        notes = 'Judgment uploaded to case file.';
      } else if (j === 1 && i % 7 === 0) {
        status = 'Adjourned';
        notes = 'Adjourned due to counsel unavailability. Next date to be fixed.';
      } else if (j === 0 && i % 11 === 0) {
        status = 'Postponed';
        notes = 'Postponed on request of respondent. Court fee paid.';
      }
      hearingRecords.push({
        caseId: c._id,
        judgeId: c.assignedJudgeId,
        hearingDate: daysFromNow(dayOffset),
        hearingTime: pick(times, hIdx++),
        location: pick(LOCATIONS, i + j),
        description: `Hearing for ${c.caseNumber} — ${c.title}`,
        status,
        outcome,
        notes,
      });
    }
  }
  const insertedHearings = await Hearing.insertMany(hearingRecords);

  const docCategories = ['petition', 'evidence', 'judgment', 'notice', 'report', 'other'];
  const docNames = [
    'plaint_petition.pdf', 'affidavit_applicant.pdf', 'property_deed.pdf',
    'court_notice.pdf', 'witness_statement.pdf', 'interim_order.pdf',
    'final_judgment.pdf', 'vakalatnama.pdf', 'cnic_copy.pdf', 'power_of_attorney.pdf',
  ];
  const documentRecords = [];
  for (let i = 0; i < insertedCases.length; i++) {
    const c = insertedCases[i];
    const uploader = lawyers.find((l) => l._id.equals(c.lawyerId)) || admins[0];
    const docCount = 2 + (i % 3);
    for (let d = 0; d < docCount; d++) {
      const name = pick(docNames, i + d);
      documentRecords.push({
        caseId: c._id,
        uploadedBy: uploader._id,
        fileName: `seed-${c.caseNumber.replace(/\//g, '-')}-${d}-${name}`,
        originalName: name,
        fileType: 'application/pdf',
        fileSize: 120000 + (i * 1000) + d * 500,
        filePath: `uploads/seed/${c.caseNumber.replace(/\//g, '-')}/${name}`,
        documentCategory: pick(docCategories, i + d),
        description: `Seed document for ${c.title}`,
      });
    }
  }
  await Document.insertMany(documentRecords);

  const notifTypes = [
    'hearing_scheduled', 'case_assigned', 'document_uploaded', 'case_closed',
    'hearing_completed', 'hearing_postponed', 'general', 'complaint_submitted',
  ];
  const notificationRecords = [];
  for (const u of userDocs) {
    const userCases = insertedCases.filter(
      (c) =>
        (c.citizenId && c.citizenId.equals(u._id)) ||
        (c.lawyerId && c.lawyerId.equals(u._id)) ||
        (c.assignedJudgeId && c.assignedJudgeId.equals(u._id))
    );
    const count = u.role === 'admin' || u.role === 'clerk' ? 8 : 5;
    for (let n = 0; n < count; n++) {
      const relCase = userCases[n % Math.max(userCases.length, 1)] || insertedCases[n % insertedCases.length];
      const relHearing = insertedHearings[n % insertedHearings.length];
      const type = pick(notifTypes, n + u.email.length);
      notificationRecords.push({
        userId: u._id,
        title: type === 'hearing_scheduled' ? 'Hearing Scheduled' : type === 'case_assigned' ? 'Judge Assigned' : 'Court Notification',
        message:
          type === 'hearing_scheduled'
            ? `Hearing scheduled for case ${relCase.caseNumber} at ${pick(LOCATIONS, n)}.`
            : type === 'case_assigned'
              ? `Judge assigned to your case ${relCase.caseNumber}.`
              : `Update regarding case ${relCase.caseNumber}: ${relCase.title}`,
        type,
        relatedCaseId: relCase._id,
        relatedHearingId: type.includes('hearing') ? relHearing._id : null,
        isRead: n % 3 === 0,
      });
    }
  }
  await Notification.insertMany(notificationRecords);

  const complaintStatuses = ['pending', 'under_review', 'resolved', 'dismissed'];
  const complaintRecords = [];
  for (let i = 0; i < citizens.length; i++) {
    const citizen = citizens[i];
    const relCase = insertedCases[i % insertedCases.length];
    complaintRecords.push({
      submittedBy: citizen._id,
      caseId: relCase._id,
      subject: pick(COMPLAINT_SUBJECTS, i),
      description: `Complaint from ${citizen.name} regarding case ${relCase.caseNumber}. Requesting timely resolution and better communication from court staff.`,
      status: pick(complaintStatuses, i),
      response: i % 3 === 0 ? 'Your complaint has been reviewed. The registry will contact you within 5 working days.' : '',
      respondedBy: i % 3 === 0 ? admins[0]._id : null,
      respondedAt: i % 3 === 0 ? daysFromNow(-2) : null,
    });
  }
  await Complaint.insertMany(complaintRecords);

  const auditActions = [
    'user_login', 'case_created', 'judge_assigned', 'hearing_scheduled',
    'document_uploaded', 'hearing_outcome_recorded', 'complaint_submitted', 'case_updated',
  ];
  const auditRecords = [];
  for (let i = 0; i < 40; i++) {
    const u = pick(userDocs, i);
    auditRecords.push({
      userId: u._id,
      userEmail: u.email,
      userRole: u.role,
      action: pick(auditActions, i),
      description: `Seed audit: ${pick(auditActions, i)} by ${u.name}`,
      resourceType: i % 2 === 0 ? 'Case' : 'Hearing',
      resourceId: String(pick(insertedCases, i)._id),
      ipAddress: '127.0.0.1',
    });
  }
  await AuditLog.insertMany(auditRecords);

  console.log('\n========== SEED COMPLETE ==========');
  console.log(`Users:         ${userDocs.length}`);
  console.log(`Cases:         ${insertedCases.length}`);
  console.log(`Hearings:      ${insertedHearings.length}`);
  console.log(`Documents:     ${documentRecords.length}`);
  console.log(`Notifications: ${notificationRecords.length}`);
  console.log(`Complaints:    ${complaintRecords.length}`);
  console.log(`Audit logs:    ${auditRecords.length}`);
  console.log(`\nDefault password for ALL seed users: ${SEED_PASSWORD}`);
  console.log('See scripts/SEED_DATA.md for full login list.\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
