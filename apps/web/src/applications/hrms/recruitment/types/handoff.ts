import type { AvatarColor } from '../../../../design-system/components';

export type HandoffStatus =
  | 'ready_for_handoff'
  | 'handoff_in_progress'
  | 'handoff_completed'
  | 'on_hold';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchField?: 'email' | 'phone' | 'pan';
  existingEmployeeId?: string;
  existingEmployeeName?: string;
  existingEmployeeCode?: string;
  resolutionType?: 'new_employee' | 'rehire' | 'ignore';
}

export interface OnboardingHandoffItem {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateNumber: string;
  candidateAvatarColor: AvatarColor;
  offerId: string;
  offerNumber: string;
  jobId: string;
  jobTitle: string;
  jobCode: string;
  department: string;
  location: string;
  designationLevel: string;
  targetJoiningDate: string;
  status: HandoffStatus;
  signedOfferReceived: boolean;
  bgvStatus: 'cleared' | 'in_progress' | 'pending' | 'waived';
  assignedPartner: string;
  onboardingCaseId?: string;
  onboardingCaseCode?: string;
  employeeCode?: string;
  handoffDate?: string;
  duplicateCheck: DuplicateCheckResult;
  workflowTemplate?: string;
  notes?: string;
}

export interface ConvertHandoffInput {
  handoffId: string;
  workflowTemplate: string;
  assignedPartner: string;
  isRehire: boolean;
  triggerItProvisioning: boolean;
  targetJoiningDate: string;
  notes?: string;
}
