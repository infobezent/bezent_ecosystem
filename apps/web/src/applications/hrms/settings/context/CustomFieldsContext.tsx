import { createContext, useContext, useState, type ReactNode } from 'react';
import type {
  OnboardingSectionConfig,
  OnboardingCardConfig,
  OnboardingFieldConfig,
} from '../types/settingsCenter';

const DEFAULT_SECTIONS: OnboardingSectionConfig[] = [
  { id: 'general', title: 'General', hidden: false, isCustom: false },
  { id: 'personal', title: 'Personal Information', hidden: false, isCustom: false },
  { id: 'onboarding', title: 'Administration', hidden: false, isCustom: false },
  { id: 'skills', title: 'Skills', hidden: false, isCustom: false },
  { id: 'emergency', title: 'Emergency Contact', hidden: false, isCustom: false },
  { id: 'accounts', title: 'Accounts', hidden: false, isCustom: false },
  { id: 'online_access', title: 'Online Access', hidden: false, isCustom: false },
  { id: 'working_hours', title: 'Working Hours', hidden: false, isCustom: false },
  { id: 'documents', title: 'Documents', hidden: false, isCustom: false },
  { id: 'review', title: 'Review', hidden: false, isCustom: false },
];

const INITIAL_CARDS: OnboardingCardConfig[] = [
  // General
  { id: 'c_gen_details', sectionId: 'general', title: 'EMPLOYMENT DETAILS', isCustom: false },

  // Personal Information
  { id: 'c_pers_details', sectionId: 'personal', title: 'PERSONAL DETAILS', isCustom: false },
  { id: 'c_pers_family', sectionId: 'personal', title: 'FAMILY & NOMINATION', isCustom: false },
  { id: 'c_pers_contact', sectionId: 'personal', title: 'CONTACT DETAILS', isCustom: false },
  { id: 'c_pers_address', sectionId: 'personal', title: 'ADDRESS DETAILS', isCustom: false },

  // Administration
  {
    id: 'c_admin_details',
    sectionId: 'onboarding',
    title: 'ADMINISTRATION DETAILS',
    isCustom: false,
  },

  // Skills
  { id: 'c_skills_details', sectionId: 'skills', title: 'SKILLS & COMPETENCIES', isCustom: false },

  // Emergency Contact
  {
    id: 'c_emerg_primary',
    sectionId: 'emergency',
    title: 'PRIMARY EMERGENCY CONTACT',
    isCustom: false,
  },
  {
    id: 'c_emerg_secondary',
    sectionId: 'emergency',
    title: 'SECONDARY EMERGENCY CONTACT',
    isCustom: false,
  },

  // Accounts
  { id: 'c_acc_bank', sectionId: 'accounts', title: 'BANK ACCOUNT DETAILS', isCustom: false },
  { id: 'c_acc_salary', sectionId: 'accounts', title: 'SALARY & COMPENSATION', isCustom: false },

  // Online Access
  {
    id: 'c_online_credentials',
    sectionId: 'online_access',
    title: 'SYSTEM ACCESS CREDENTIALS',
    isCustom: false,
  },

  // Working Hours
  {
    id: 'c_working_schedule',
    sectionId: 'working_hours',
    title: 'SHIFT & SCHEDULE SETTINGS',
    isCustom: false,
  },

  // Documents
  {
    id: 'c_doc_details',
    sectionId: 'documents',
    title: 'IDENTITY & EDUCATIONAL DOCUMENTS',
    isCustom: false,
  },

  // Review
  {
    id: 'c_review_summary',
    sectionId: 'review',
    title: 'REGISTRATION SUMMARY & VERIFICATION',
    isCustom: false,
  },
];

const INITIAL_FIELDS: OnboardingFieldConfig[] = [
  // General -> Employment Details
  {
    id: 'f_gen_1',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'First Name',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_gen_2',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Last Name',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_gen_3',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Work Email',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_gen_4',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Employee ID',
    fieldType: 'text',
    required: true,
    readOnly: true,
    isSystem: true,
  },
  {
    id: 'f_gen_5',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Employment Type',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Full Time', 'Part Time', 'Contract', 'Intern'],
    isSystem: true,
  },
  {
    id: 'f_gen_6',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Employment Status',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Pending Activation', 'Active', 'Probation'],
    isSystem: true,
  },
  {
    id: 'f_gen_7',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Department',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Engineering', 'Human Resources', 'Finance', 'Operations'],
    isSystem: true,
  },
  {
    id: 'f_gen_8',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Team',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Product Development', 'Frontend Engineering', 'Backend Engineering'],
    isSystem: true,
  },
  {
    id: 'f_gen_9',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Designation',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Software Engineer', 'Product Manager', 'HR Specialist', 'UI/UX Designer'],
    isSystem: true,
  },
  {
    id: 'f_gen_10',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Grade / Level',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['L1 - Entry Level', 'L2 - Mid Level', 'L3 - Senior Level'],
    isSystem: true,
  },
  {
    id: 'f_gen_11',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Reporting Manager',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Rakesh Kumar', 'Priya Sharma'],
    isSystem: true,
  },
  {
    id: 'f_gen_12',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Organisation Unit',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Technology', 'Corporate'],
    isSystem: true,
  },
  {
    id: 'f_gen_13',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Office Location',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Chennai - Main Office', 'Bangalore Hub'],
    isSystem: true,
  },
  {
    id: 'f_gen_14',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Date of Joining',
    fieldType: 'date',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_gen_15',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Confirmed Joining Date',
    fieldType: 'date',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_gen_16',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Source of Hire',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Direct Applicant', 'Employee Referral', 'Campus'],
    isSystem: true,
  },
  {
    id: 'f_gen_17',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Probation Period',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['3 Months', '6 Months', 'Custom'],
    isSystem: true,
  },
  {
    id: 'f_gen_18',
    sectionId: 'general',
    cardId: 'c_gen_details',
    label: 'Notice Period',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['15 Days', '30 Days', '60 Days', '90 Days'],
    isSystem: true,
  },

  // Personal Information -> Personal Details
  {
    id: 'f_pers_1',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Profile Photo',
    fieldType: 'file',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_2',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Employee ID',
    fieldType: 'text',
    required: true,
    readOnly: true,
    isSystem: true,
  },
  {
    id: 'f_pers_3',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'First Name',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_4',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Middle Name',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_5',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Last Name',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_6',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Preferred Name',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_7',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Gender',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Male', 'Female', 'Non-Binary', 'Prefer not to say'],
    isSystem: true,
  },
  {
    id: 'f_pers_8',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Date of Birth',
    fieldType: 'date',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_9',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Marital Status',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Single', 'Married', 'Divorced', 'Widowed'],
    isSystem: true,
  },
  {
    id: 'f_pers_10',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Blood Group',
    fieldType: 'select',
    required: false,
    readOnly: false,
    options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    isSystem: true,
  },
  {
    id: 'f_pers_11',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Nationality',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Indian', 'American', 'British', 'Canadian', 'Other'],
    isSystem: true,
  },
  {
    id: 'f_pers_12',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Native Language',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['English', 'Hindi', 'Tamil', 'Telugu', 'Other'],
    isSystem: true,
  },
  {
    id: 'f_pers_13',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: "Father's Name",
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_14',
    sectionId: 'personal',
    cardId: 'c_pers_details',
    label: 'Guardian Name',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },

  // Personal Information -> Family & Nomination
  {
    id: 'f_pers_15',
    sectionId: 'personal',
    cardId: 'c_pers_family',
    label: 'Family Members',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_16',
    sectionId: 'personal',
    cardId: 'c_pers_family',
    label: 'Nomination Details',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },

  // Personal Information -> Contact Details
  {
    id: 'f_pers_17',
    sectionId: 'personal',
    cardId: 'c_pers_contact',
    label: 'Time Zone',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Asia/Kolkata (IST)', 'America/New_York (EST)', 'Europe/London (GMT)'],
    isSystem: true,
  },
  {
    id: 'f_pers_18',
    sectionId: 'personal',
    cardId: 'c_pers_contact',
    label: 'Mobile Phone',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_19',
    sectionId: 'personal',
    cardId: 'c_pers_contact',
    label: 'Home Phone',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_20',
    sectionId: 'personal',
    cardId: 'c_pers_contact',
    label: 'Business Phone',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_21',
    sectionId: 'personal',
    cardId: 'c_pers_contact',
    label: 'Work Phone',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_22',
    sectionId: 'personal',
    cardId: 'c_pers_contact',
    label: 'Email Address',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },

  // Personal Information -> Address Details
  {
    id: 'f_pers_23',
    sectionId: 'personal',
    cardId: 'c_pers_address',
    label: 'Street',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_24',
    sectionId: 'personal',
    cardId: 'c_pers_address',
    label: 'City',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_25',
    sectionId: 'personal',
    cardId: 'c_pers_address',
    label: 'State',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_26',
    sectionId: 'personal',
    cardId: 'c_pers_address',
    label: 'Pin Code',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_pers_27',
    sectionId: 'personal',
    cardId: 'c_pers_address',
    label: 'Country',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['India', 'United States', 'United Kingdom', 'Canada', 'Other'],
    isSystem: true,
  },

  // Administration
  {
    id: 'f_adm_1',
    sectionId: 'onboarding',
    cardId: 'c_admin_details',
    label: 'NDA & Confidentiality Agreement',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Signed', 'Pending'],
    isSystem: true,
  },
  {
    id: 'f_adm_2',
    sectionId: 'onboarding',
    cardId: 'c_admin_details',
    label: 'IT & Security Orientation',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Completed', 'In Progress', 'Pending'],
    isSystem: true,
  },
  {
    id: 'f_adm_3',
    sectionId: 'onboarding',
    cardId: 'c_admin_details',
    label: 'Assigned Work Laptop',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_adm_4',
    sectionId: 'onboarding',
    cardId: 'c_admin_details',
    label: 'Security Keycard ID',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_adm_5',
    sectionId: 'onboarding',
    cardId: 'c_admin_details',
    label: 'Background Verification Status',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Verified', 'In Progress', 'Pending'],
    isSystem: true,
  },

  // Skills
  {
    id: 'f_skl_1',
    sectionId: 'skills',
    cardId: 'c_skills_details',
    label: 'Primary Skill / Competency',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_skl_2',
    sectionId: 'skills',
    cardId: 'c_skills_details',
    label: 'Proficiency Level',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Level 1 - Basic', 'Level 2 - Proficient', 'Level 3 - Advanced', 'Level 4 - Expert'],
    isSystem: true,
  },
  {
    id: 'f_skl_3',
    sectionId: 'skills',
    cardId: 'c_skills_details',
    label: 'Years of Experience',
    fieldType: 'number',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_skl_4',
    sectionId: 'skills',
    cardId: 'c_skills_details',
    label: 'Secondary Skills',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_skl_5',
    sectionId: 'skills',
    cardId: 'c_skills_details',
    label: 'Certifications & Qualifications',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_skl_6',
    sectionId: 'skills',
    cardId: 'c_skills_details',
    label: 'Technical Mentor',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },

  // Emergency Contact
  {
    id: 'f_emg_1',
    sectionId: 'emergency',
    cardId: 'c_emerg_primary',
    label: 'Primary Contact Name',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_emg_2',
    sectionId: 'emergency',
    cardId: 'c_emerg_primary',
    label: 'Relationship',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Spouse', 'Parent', 'Sibling', 'Guardian', 'Friend'],
    isSystem: true,
  },
  {
    id: 'f_emg_3',
    sectionId: 'emergency',
    cardId: 'c_emerg_primary',
    label: 'Primary Phone Number',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_emg_4',
    sectionId: 'emergency',
    cardId: 'c_emerg_primary',
    label: 'Alternate Contact Phone',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_emg_5',
    sectionId: 'emergency',
    cardId: 'c_emerg_primary',
    label: 'Primary Contact Address',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_emg_6',
    sectionId: 'emergency',
    cardId: 'c_emerg_secondary',
    label: 'Secondary Contact Name',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_emg_7',
    sectionId: 'emergency',
    cardId: 'c_emerg_secondary',
    label: 'Secondary Relationship',
    fieldType: 'select',
    required: false,
    readOnly: false,
    options: ['Spouse', 'Parent', 'Sibling', 'Guardian', 'Friend'],
    isSystem: true,
  },
  {
    id: 'f_emg_8',
    sectionId: 'emergency',
    cardId: 'c_emerg_secondary',
    label: 'Secondary Phone Number',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },

  // Accounts
  {
    id: 'f_acc_1',
    sectionId: 'accounts',
    cardId: 'c_acc_bank',
    label: 'Bank Account Number',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_acc_2',
    sectionId: 'accounts',
    cardId: 'c_acc_bank',
    label: 'IFSC Code',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_acc_3',
    sectionId: 'accounts',
    cardId: 'c_acc_bank',
    label: 'Bank Name & Branch',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_acc_4',
    sectionId: 'accounts',
    cardId: 'c_acc_bank',
    label: 'Account Holder Name',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_acc_5',
    sectionId: 'accounts',
    cardId: 'c_acc_salary',
    label: 'Salary Structure Band',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Grade L1 Band', 'Grade L2 Band', 'Executive Band'],
    isSystem: true,
  },
  {
    id: 'f_acc_6',
    sectionId: 'accounts',
    cardId: 'c_acc_salary',
    label: 'Annual CTC (₹)',
    fieldType: 'number',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_acc_7',
    sectionId: 'accounts',
    cardId: 'c_acc_salary',
    label: 'Tax Regime Choice',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['New Tax Regime', 'Old Tax Regime'],
    isSystem: true,
  },
  {
    id: 'f_acc_8',
    sectionId: 'accounts',
    cardId: 'c_acc_salary',
    label: 'PF Account Number',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_acc_9',
    sectionId: 'accounts',
    cardId: 'c_acc_salary',
    label: 'UAN Number',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },

  // Online Access
  {
    id: 'f_onl_1',
    sectionId: 'online_access',
    cardId: 'c_online_credentials',
    label: 'Official Work Email',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_onl_2',
    sectionId: 'online_access',
    cardId: 'c_online_credentials',
    label: 'Portal Username',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_onl_3',
    sectionId: 'online_access',
    cardId: 'c_online_credentials',
    label: 'Portal Role Scope',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Employee', 'Manager', 'HR Admin', 'System Administrator'],
    isSystem: true,
  },
  {
    id: 'f_onl_4',
    sectionId: 'online_access',
    cardId: 'c_online_credentials',
    label: 'Multi-Factor Authentication (MFA)',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Enabled', 'Enforced on Next Login', 'Disabled'],
    isSystem: true,
  },

  // Working Hours
  {
    id: 'f_wrk_1',
    sectionId: 'working_hours',
    cardId: 'c_working_schedule',
    label: 'Standard Shift Schedule',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: [
      'Standard General Shift (9:00 AM - 6:00 PM)',
      'UK Shift (2:00 PM - 11:00 PM)',
      'US Shift (6:30 PM - 3:30 AM)',
    ],
    isSystem: true,
  },
  {
    id: 'f_wrk_2',
    sectionId: 'working_hours',
    cardId: 'c_working_schedule',
    label: 'Working Days / Week',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['5 Days (Mon-Fri)', '6 Days (Mon-Sat)'],
    isSystem: true,
  },
  {
    id: 'f_wrk_3',
    sectionId: 'working_hours',
    cardId: 'c_working_schedule',
    label: 'Assigned Holiday Calendar',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['India Corporate Calendar 2026', 'US Corporate Calendar 2026'],
    isSystem: true,
  },
  {
    id: 'f_wrk_4',
    sectionId: 'working_hours',
    cardId: 'c_working_schedule',
    label: 'Time Zone',
    fieldType: 'select',
    required: true,
    readOnly: false,
    options: ['Asia/Kolkata (IST, UTC+5:30)', 'America/New_York (EST)', 'Europe/London (GMT)'],
    isSystem: true,
  },

  // Documents
  {
    id: 'f_doc_1',
    sectionId: 'documents',
    cardId: 'c_doc_details',
    label: 'Passport Photo Upload',
    fieldType: 'file',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_doc_2',
    sectionId: 'documents',
    cardId: 'c_doc_details',
    label: 'National ID Card (Aadhaar/PAN)',
    fieldType: 'file',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_doc_3',
    sectionId: 'documents',
    cardId: 'c_doc_details',
    label: 'Educational Certificates',
    fieldType: 'file',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_doc_4',
    sectionId: 'documents',
    cardId: 'c_doc_details',
    label: 'Relieving / Experience Letter',
    fieldType: 'file',
    required: false,
    readOnly: false,
    isSystem: true,
  },

  // Review
  {
    id: 'f_rev_1',
    sectionId: 'review',
    cardId: 'c_review_summary',
    label: 'Registration Summary & Verification Checklist',
    fieldType: 'text',
    required: true,
    readOnly: false,
    isSystem: true,
  },
  {
    id: 'f_rev_2',
    sectionId: 'review',
    cardId: 'c_review_summary',
    label: 'HR Review Notes',
    fieldType: 'text',
    required: false,
    readOnly: false,
    isSystem: true,
  },
];

interface CustomFieldsContextType {
  sections: OnboardingSectionConfig[];
  cards: OnboardingCardConfig[];
  fields: OnboardingFieldConfig[];
  addSection: (title: string) => { sectionId: string; cardId: string };
  toggleHideSection: (id: string) => void;
  reorderSection: (index: number, direction: 'up' | 'down') => void;
  deleteSection: (id: string) => void;
  renameSection: (id: string, newTitle: string) => void;

  addCard: (sectionId: string, title: string) => string;
  renameCard: (cardId: string, newTitle: string) => void;
  reorderCard: (sectionId: string, cardIndex: number, direction: 'up' | 'down') => void;
  deleteCard: (cardId: string) => void;

  addField: (field: Omit<OnboardingFieldConfig, 'id'>) => void;
  updateField: (id: string, field: Partial<OnboardingFieldConfig>) => void;
  deleteField: (id: string) => void;
  reorderField: (cardId: string, fieldIndex: number, direction: 'up' | 'down') => void;
}

const CustomFieldsContext = createContext<CustomFieldsContextType | undefined>(undefined);

export function CustomFieldsProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<OnboardingSectionConfig[]>(DEFAULT_SECTIONS);
  const [cards, setCards] = useState<OnboardingCardConfig[]>(INITIAL_CARDS);
  const [fields, setFields] = useState<OnboardingFieldConfig[]>(INITIAL_FIELDS);

  // Section Operations
  const addSection = (title: string): { sectionId: string; cardId: string } => {
    const timestamp = Date.now();
    const newSecId = `custom_sec_${timestamp}`;
    const newCardId = `card_${timestamp}`;
    const newSec: OnboardingSectionConfig = {
      id: newSecId,
      title: title.trim(),
      hidden: false,
      isCustom: true,
    };
    setSections((prev) => [...prev, newSec]);
    // Automatically add a default card for custom section
    const defaultCard: OnboardingCardConfig = {
      id: newCardId,
      sectionId: newSecId,
      title: `${title.trim().toUpperCase()} DETAILS`,
      isCustom: true,
    };
    setCards((prev) => [...prev, defaultCard]);
    return { sectionId: newSecId, cardId: newCardId };
  };

  const toggleHideSection = (id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)));
  };

  const reorderSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const copy = [...sections];
    const temp = copy[index]!;
    copy[index] = copy[targetIndex]!;
    copy[targetIndex] = temp;
    setSections(copy);
  };

  const deleteSection = (id: string) => {
    const sec = sections.find((s) => s.id === id);
    if (!sec?.isCustom) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    setCards((prev) => prev.filter((c) => c.sectionId !== id));
    setFields((prev) => prev.filter((f) => f.sectionId !== id));
  };

  const renameSection = (id: string, newTitle: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s)));
  };

  // Card Operations
  const addCard = (sectionId: string, title: string): string => {
    const newCardId = `card_${Date.now()}`;
    const newCard: OnboardingCardConfig = {
      id: newCardId,
      sectionId,
      title: title.trim(),
      isCustom: true,
    };
    setCards((prev) => [...prev, newCard]);
    return newCardId;
  };

  const renameCard = (cardId: string, newTitle: string) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, title: newTitle.trim() } : c)));
  };

  const reorderCard = (sectionId: string, cardIndex: number, direction: 'up' | 'down') => {
    const sectionCards = cards.filter((c) => c.sectionId === sectionId);
    const targetIndex = direction === 'up' ? cardIndex - 1 : cardIndex + 1;
    if (targetIndex < 0 || targetIndex >= sectionCards.length) return;

    const sourceCard = sectionCards[cardIndex]!;
    const targetCard = sectionCards[targetIndex]!;

    setCards((prev) => {
      const copy = [...prev];
      const sourceGlobalIdx = copy.findIndex((c) => c.id === sourceCard.id);
      const targetGlobalIdx = copy.findIndex((c) => c.id === targetCard.id);
      if (sourceGlobalIdx !== -1 && targetGlobalIdx !== -1) {
        const temp = copy[sourceGlobalIdx]!;
        copy[sourceGlobalIdx] = copy[targetGlobalIdx]!;
        copy[targetGlobalIdx] = temp;
      }
      return copy;
    });
  };

  const deleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setFields((prev) => prev.filter((f) => f.cardId !== cardId));
  };

  // Field Operations
  const addField = (field: Omit<OnboardingFieldConfig, 'id'>) => {
    const newField: OnboardingFieldConfig = {
      ...field,
      id: `f_${Date.now()}`,
      isCustom: field.isCustom !== undefined ? field.isCustom : true,
    };
    setFields((prev) => [...prev, newField]);
  };

  const updateField = (id: string, fieldUpdate: Partial<OnboardingFieldConfig>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...fieldUpdate } : f)));
  };

  const deleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const reorderField = (cardId: string, fieldIndex: number, direction: 'up' | 'down') => {
    const cardFields = fields.filter((f) => f.cardId === cardId);
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    if (targetIndex < 0 || targetIndex >= cardFields.length) return;

    const sourceField = cardFields[fieldIndex]!;
    const targetField = cardFields[targetIndex]!;

    setFields((prev) => {
      const copy = [...prev];
      const sourceGlobalIdx = copy.findIndex((f) => f.id === sourceField.id);
      const targetGlobalIdx = copy.findIndex((f) => f.id === targetField.id);
      if (sourceGlobalIdx !== -1 && targetGlobalIdx !== -1) {
        const temp = copy[sourceGlobalIdx]!;
        copy[sourceGlobalIdx] = copy[targetGlobalIdx]!;
        copy[targetGlobalIdx] = temp;
      }
      return copy;
    });
  };

  return (
    <CustomFieldsContext.Provider
      value={{
        sections,
        cards,
        fields,
        addSection,
        toggleHideSection,
        reorderSection,
        deleteSection,
        renameSection,
        addCard,
        renameCard,
        reorderCard,
        deleteCard,
        addField,
        updateField,
        deleteField,
        reorderField,
      }}
    >
      {children}
    </CustomFieldsContext.Provider>
  );
}

export function useCustomFields() {
  const context = useContext(CustomFieldsContext);
  if (!context) {
    throw new Error('useCustomFields must be used within a CustomFieldsProvider');
  }
  return context;
}
