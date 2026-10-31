import type { AvatarColor } from '../../../../design-system/components';

export interface HiringKpiSummary {
  avgTimeToHireDays: number;
  avgTimeToFillDays: number;
  offerAcceptanceRate: number;
  totalHiresThisQuarter: number;
  costPerHireInr: number;
  qualityOfHireScore: number;
}

export interface SourceEffectivenessItem {
  source: string;
  channel: string;
  candidatesCount: number;
  interviewedCount: number;
  offeredCount: number;
  hiredCount: number;
  conversionRate: number; // percentage
  avgDaysToHire: number;
}

export interface StageConversionStep {
  stageId: string;
  stageName: string;
  count: number;
  conversionFromPrevious: number; // percentage
  avgStageDays: number;
}

export interface RecruiterWorkloadItem {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: AvatarColor;
  activeRequisitions: number;
  activePipelineCandidates: number;
  interviewsFacilitated: number;
  offersReleased: number;
  hiresClosed: number;
  avgTimeToHireDays: number;
}

export interface DepartmentVelocityItem {
  department: string;
  openPositions: number;
  inPipeline: number;
  hiresYtd: number;
  avgTimeToFillDays: number;
}
