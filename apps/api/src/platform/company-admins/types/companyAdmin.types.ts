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
    tempPassword?: string;
  };
}

export interface AssignmentResult {
  assignment: CompanyAdminAssignment;
  invitationDelivery: {
    status: 'MANUAL_DELIVERY_REQUIRED' | 'ALREADY_ASSIGNED';
    message: string;
    temporaryPassword?: string;
  };
}
