import type { AvatarColor } from '../../../../design-system/components';

export type OfferStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'revoked';

export interface SalaryBreakdown {
  basePay: number;
  houseRentAllowance: number;
  specialAllowance: number;
  statutoryBonus: number;
  providentFundEmployer: number;
  performanceBonus: number;
  stockOptionsValue?: number;
  totalCtc: number;
}

export interface OfferApprovalStep {
  id: string;
  approverRole: string;
  approverName: string;
  approverEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  actionDate?: string;
  comments?: string;
}

export interface JobOffer {
  id: string;
  offerNumber: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateNumber: string;
  candidateAvatarColor: AvatarColor;
  jobId: string;
  jobTitle: string;
  jobCode: string;
  department: string;
  location: string;
  designationLevel: string;
  status: OfferStatus;
  compensation: SalaryBreakdown;
  currency: string;
  offeredDate?: string;
  expiryDate: string;
  targetJoiningDate: string;
  actualJoiningDate?: string;
  approvalChain: OfferApprovalStep[];
  offerLetterUrl?: string;
  signedDocumentUrl?: string;
  declineReason?: string;
  notes?: string;
  isHandoffCompleted?: boolean;
}

export interface CreateOfferInput {
  candidateId: string;
  jobId: string;
  designationLevel: string;
  totalCtc: number;
  basePay: number;
  performanceBonus: number;
  stockOptionsValue?: number;
  targetJoiningDate: string;
  expiryDate: string;
  notes?: string;
}
