export interface CompanyAdminAssignment {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tenantId: string;
  tenantName?: string;
  companyId: string;
  companyName?: string;
  role: string;
  status: string;
  assignedAt: string;
}

export interface AssignCompanyAdminDto {
  tenantId: string;
  companyId: string;
  userId?: string;
  newUser?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

/**
 * Outcome of telling a user how to sign in (ADR-018: Email OTP, no password
 * is ever generated or shown). The access grant itself is already committed.
 */
export interface SignInInvitationDelivery {
  status: 'INVITATION_EMAILED' | 'INVITATION_EMAIL_FAILED';
  message: string;
}

export interface AssignmentResult {
  assignment: CompanyAdminAssignment;
  invitationDelivery: SignInInvitationDelivery;
}
