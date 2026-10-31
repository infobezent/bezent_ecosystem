export type JobStatus = 'open' | 'draft' | 'on_hold' | 'closed';

export type JobStatusFilter = 'all' | JobStatus;

export type WorkplaceType = 'on_site' | 'hybrid' | 'remote';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface HiringTeamMember {
  name: string;
  role: string;
  email: string;
  avatarColor?: 'default' | 'blue' | 'pink' | 'purple' | 'amber' | 'green' | 'cyan';
}

export interface PipelineStageCount {
  applied: number;
  screening: number;
  interview: number;
  assessment: number;
  offer: number;
  hired: number;
}

export interface JobOpening {
  id: string;
  jobCode: string;
  title: string;
  department: string;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  status: JobStatus;
  positionsCount: number;
  filledCount: number;
  totalApplicants: number;
  postedDate: string;
  targetCloseDate: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  hiringManager: HiringTeamMember;
  recruiter: HiringTeamMember;
  interviewers: HiringTeamMember[];
  skills: string[];
  description: string;
  requirements: string[];
  responsibilities: string[];
  pipeline: PipelineStageCount;
}

export interface CreateJobInput {
  title: string;
  jobCode?: string;
  department: string;
  location: string;
  workplaceType: WorkplaceType;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  status: JobStatus;
  positionsCount: number;
  targetCloseDate: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  hiringManagerName: string;
  hiringManagerRole: string;
  recruiterName: string;
  skillsRaw: string;
  description: string;
  responsibilitiesRaw: string;
  requirementsRaw: string;
}
