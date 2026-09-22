import { useState } from 'react';
import { BezentIcon } from '../../design-system/icons';
import { EmptyState } from '../../design-system/components';
import {
  ToneChip,
  UtilityDrawerFilterPanel,
  UtilityDrawerFooter,
  UtilityDrawerHeader,
  UtilityDrawerTabs,
  UtilityFooterLink,
  UtilityIconAction,
  UtilityLinkButton,
} from '../utility-drawer';
import type { ApprovalItem } from './types';
import './ApprovalsDrawer.css';

type ApprovalTab = 'pending' | 'urgent' | 'actioned';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'actioned', label: 'Recently Actioned' },
] as const;

export interface ApprovalsDrawerProps {
  approvals: ApprovalItem[];
  onClose: () => void;
  onViewAll?: () => void;
  onReview?: (id: string) => void;
  /** Request-type filter options are contributed by applications; omitted when none. */
  requestTypeOptions?: string[];
}

/**
 * The global Approvals drawer body. Source: old approved UI
 * `ApprovalDrawer` / `ApprovalRow` (`App.tsx` 4034-4232). The approval
 * centre and per-request review screens are separate, deferred UI.
 */
export function ApprovalsDrawer({
  approvals,
  onClose,
  onViewAll,
  onReview,
  requestTypeOptions,
}: ApprovalsDrawerProps) {
  const [tab, setTab] = useState<ApprovalTab>('pending');
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = approvals.filter((a) =>
    tab === 'pending'
      ? a.status === 'Pending'
      : tab === 'urgent'
        ? a.status === 'Pending' && a.priority === 'Urgent'
        : a.status !== 'Pending',
  );
  const pendingCount = approvals.filter((a) => a.status === 'Pending').length;

  const filterGroups = [
    ...(requestTypeOptions?.length ? [{ label: 'Type', options: requestTypeOptions }] : []),
    { label: 'Priority', options: ['Urgent', 'Normal'] },
    { label: 'Submitted', options: ['Today', 'Last 7 Days', 'Last 30 Days'] },
  ];

  return (
    <div className="approvals-drawer">
      <UtilityDrawerHeader
        title="Approvals"
        description="Requests waiting for your decision"
        icon="approvals"
        count={pendingCount}
        onFullScreen={onViewAll}
        onClose={onClose}
        actions={
          <UtilityIconAction
            icon="filter"
            label="Filter"
            active={filterOpen}
            onClick={() => setFilterOpen((v) => !v)}
          />
        }
      />
      <UtilityDrawerTabs tabs={TABS} value={tab} onChange={setTab} label="Approval views" />
      {filterOpen && <UtilityDrawerFilterPanel groups={filterGroups} />}

      <div className="approvals-drawer__list">
        {visible.map((approval) => (
          <ApprovalRow
            key={approval.id}
            approval={approval}
            onReview={() => onReview?.(approval.id)}
          />
        ))}
        {visible.length === 0 && (
          <EmptyState
            size="compact"
            title={tab === 'actioned' ? 'No recently actioned requests' : 'No pending approvals'}
            description={
              tab === 'actioned'
                ? 'Requests you approve or reject will appear here.'
                : 'All pending requests have been reviewed.'
            }
          />
        )}
      </div>

      <UtilityDrawerFooter>
        <UtilityFooterLink onClick={onViewAll}>View all approvals →</UtilityFooterLink>
      </UtilityDrawerFooter>
    </div>
  );
}

function ApprovalRow({ approval, onReview }: { approval: ApprovalItem; onReview: () => void }) {
  const urgent = approval.priority === 'Urgent';
  return (
    <div className="approval-row">
      <span className={`approval-row__icon ${urgent ? 'is-urgent' : ''}`.trim()}>
        <BezentIcon name={approval.icon} size={16} color="currentColor" />
      </span>
      <div className="approval-row__body">
        <div className="approval-row__name-line">
          <span className="approval-row__name">{approval.requester}</span>
          {urgent && (
            <ToneChip tone="danger" caps>
              Urgent
            </ToneChip>
          )}
        </div>
        <div className="approval-row__type">{approval.requestType}</div>
        <div className="approval-row__summary">{approval.summary}</div>
        <div className="approval-row__meta">
          <span className="approval-row__submitted">Submitted {approval.submitted}</span>
          <span className="approval-row__dot" aria-hidden="true" />
          <UtilityLinkButton onClick={onReview}>Review →</UtilityLinkButton>
        </div>
      </div>
    </div>
  );
}
