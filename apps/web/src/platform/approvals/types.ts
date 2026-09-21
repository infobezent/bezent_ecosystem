import type { BezentIconName } from '../../design-system/icons';

/**
 * Presentation contract for the global Approvals drawer. Approvals is
 * cross-application infrastructure: any application (HRMS leave, a CRM
 * discount, a PM change request, ...) can contribute items through this
 * generic shape. Nothing here is specific to one application.
 */
export type ApprovalPriority = 'Urgent' | 'Normal';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ApprovalItem {
  id: string;
  /** Who/what raised the request. */
  requester: string;
  /** Kind of request, e.g. "Access Request". */
  requestType: string;
  icon: BezentIconName;
  /** One-line summary shown under the type. */
  summary: string;
  /** Display text, e.g. "20 min ago". */
  submitted: string;
  priority: ApprovalPriority;
  status: ApprovalStatus;
}
