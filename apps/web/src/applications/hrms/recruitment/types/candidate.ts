export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'shortlisted'
  | 'interview'
  | 'assessment'
  | 'selected'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type CandidateSource =
  'linkedin' | 'career_page' | 'referral' | 'agency' | 'naukri' | 'campus' | 'direct';

export interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  current?: boolean;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}

export interface ApplicationHistoryItem {
  id: string;
  jobTitle: string;
  jobCode: string;
  department: string;
  appliedDate: string;
  stage: CandidateStage;
  rating?: number;
  feedbackNotes?: string;
}

export interface Candidate {
  id: string;
  candidateNumber: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  nationality?: string;
  nationalityFlag?: string;
  nationalityCountryCode?: string;
  locationFlag?: string;
  locationCountryCode?: string;
  genderGlyph?: '♂' | '♀';
  isFavorite?: boolean;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperienceYears: number;
  relevantExperienceYears: number;
  source: CandidateSource;
  referredBy?: string;
  tags: string[];
  skills: string[];
  appliedJobId: string;
  appliedJobTitle: string;
  appliedJobCode: string;
  currentStage: CandidateStage;
  rating: number; // 1 to 5
  appliedDate: string;
  resumeFileName: string;
  summary: string;
  noticePeriodDays: number;
  currentCtcLpa?: number;
  expectedCtcLpa?: number;
  experienceHistory: ExperienceEntry[];
  educationHistory: EducationEntry[];
  applicationHistory: ApplicationHistoryItem[];
  hiringNotes?: string[];
}

export interface AddCandidateInput {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  appliedJobId: string;
  totalExperienceYears: number;
  currentCompany?: string;
  currentDesignation?: string;
  source: CandidateSource;
  referredBy?: string;
  noticePeriodDays: number;
  currentCtcLpa?: number;
  expectedCtcLpa?: number;
  skillsRaw: string;
  tagsRaw: string;
  summary: string;
  resumeFileName?: string;
}
