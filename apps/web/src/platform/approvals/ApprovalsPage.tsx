import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BezentIcon } from '../../design-system/icons';
import { Avatar } from '../../design-system/components';
import type { ApprovalItem } from './types';
import './ApprovalsPage.css';

interface OutletContextData {
  approvals?: ApprovalItem[];
}

export function ApprovalsPage() {
  const outlet = useOutletContext<OutletContextData | undefined>();
  const initialApprovals: ApprovalItem[] = outlet?.approvals ?? [
    {
      id: 'ap1',
      requester: 'Marcus Vance',
      requestType: 'Annual Leave Request',
      icon: 'leave',
      summary: '5 Days • Oct 12 – Oct 16 • Vacation',
      submitted: '25 min ago',
      priority: 'Normal',
      status: 'Pending',
    },
    {
      id: 'ap2',
      requester: 'Elena Rostova',
      requestType: 'Hardware Purchase Requisition',
      icon: 'assets',
      summary: 'MacBook Pro 16" M3 Max • Engineering Dept',
      submitted: '1 hr ago',
      priority: 'Urgent',
      status: 'Pending',
    },
    {
      id: 'ap3',
      requester: 'David Kim',
      requestType: 'Overtime Compensation Claim',
      icon: 'timesheets',
      summary: '12 Hours • Weekend Deployment Support',
      submitted: '3 hrs ago',
      priority: 'Normal',
      status: 'Pending',
    },
    {
      id: 'ap4',
      requester: 'Sarah Jenkins',
      requestType: 'Travel & Expense Reimbursement',
      icon: 'payroll',
      summary: 'Client Onsite Visit • $1,240.00',
      submitted: 'Yesterday',
      priority: 'Normal',
      status: 'Approved',
    },
  ];

  const [items, setItems] = useState<ApprovalItem[]>(initialApprovals);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>(
    'Pending',
  );

  function handleApprove(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Approved' } : item)),
    );
  }

  function handleReject(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Rejected' } : item)),
    );
  }

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'All') return true;
    return item.status === statusFilter;
  });

  const pendingCount = items.filter((i) => i.status === 'Pending').length;
  const approvedCount = items.filter((i) => i.status === 'Approved').length;
  const rejectedCount = items.filter((i) => i.status === 'Rejected').length;

  return (
    <div className="approvals-page">
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <header className="approvals-page__header">
        <div className="approvals-page__brand">
          <span className="approvals-page__brand-icon">
            <BezentIcon name="approvals" size={20} active color="currentColor" />
          </span>
          <span className="approvals-page__brand-text">Approvals Hub</span>
        </div>
      </header>

      {/* ── Main Layout (Sidebar + Grid Content) ──────────────────────── */}
      <div className="approvals-page__body">
        {/* Left Filter Sidebar */}
        <aside className="approvals-page__sidebar">
          <div className="approvals-page__nav-title">Status</div>
          <nav className="approvals-page__nav">
            <button
              type="button"
              className={`approvals-page__nav-item ${statusFilter === 'Pending' ? 'is-active' : ''}`.trim()}
              onClick={() => setStatusFilter('Pending')}
            >
              <BezentIcon name="clock" size={18} color="currentColor" />
              <span>Pending Review</span>
              <span className="approvals-page__count-badge">{pendingCount}</span>
            </button>

            <button
              type="button"
              className={`approvals-page__nav-item ${statusFilter === 'Approved' ? 'is-active' : ''}`.trim()}
              onClick={() => setStatusFilter('Approved')}
            >
              <BezentIcon name="check" size={18} color="currentColor" />
              <span>Approved</span>
              <span className="approvals-page__count-badge is-neutral">{approvedCount}</span>
            </button>

            <button
              type="button"
              className={`approvals-page__nav-item ${statusFilter === 'Rejected' ? 'is-active' : ''}`.trim()}
              onClick={() => setStatusFilter('Rejected')}
            >
              <BezentIcon name="close" size={18} color="currentColor" />
              <span>Rejected</span>
              <span className="approvals-page__count-badge is-neutral">{rejectedCount}</span>
            </button>

            <button
              type="button"
              className={`approvals-page__nav-item ${statusFilter === 'All' ? 'is-active' : ''}`.trim()}
              onClick={() => setStatusFilter('All')}
            >
              <BezentIcon name="approvals" size={18} color="currentColor" />
              <span>All Requests</span>
            </button>
          </nav>

          <div className="approvals-page__nav-divider" />

          <div className="approvals-page__nav-title">Categories</div>
          <nav className="approvals-page__nav">
            <button type="button" className="approvals-page__nav-item">
              <BezentIcon name="leave" size={18} color="currentColor" />
              <span>Leave & Absence</span>
            </button>
            <button type="button" className="approvals-page__nav-item">
              <BezentIcon name="payroll" size={18} color="currentColor" />
              <span>Expenses & Claims</span>
            </button>
            <button type="button" className="approvals-page__nav-item">
              <BezentIcon name="assets" size={18} color="currentColor" />
              <span>Equipment & Hardware</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="approvals-page__content">
          <div className="approvals-container">
            {/* KPI Metric Cards */}
            <div className="approvals-kpi-grid">
              <div className="approvals-kpi-card">
                <span className="approvals-kpi-card__label">Pending Review</span>
                <span className="approvals-kpi-card__val is-pending">{pendingCount}</span>
                <span className="approvals-kpi-card__sub">Action required by administrator</span>
              </div>

              <div className="approvals-kpi-card">
                <span className="approvals-kpi-card__label">Approved this Month</span>
                <span className="approvals-kpi-card__val is-approved">{approvedCount + 14}</span>
                <span className="approvals-kpi-card__sub">Avg. turnaround 1.2 hrs</span>
              </div>

              <div className="approvals-kpi-card">
                <span className="approvals-kpi-card__label">Audit Compliance</span>
                <span className="approvals-kpi-card__val is-compliance">100%</span>
                <span className="approvals-kpi-card__sub">All actions logged securely</span>
              </div>
            </div>

            {/* List Table / Cards */}
            <div className="approvals-list-header">
              <h2 className="approvals-list-title">
                {statusFilter} Requests ({filteredItems.length})
              </h2>
            </div>

            <div className="approvals-items-grid">
              {filteredItems.map((item) => {
                const initials = item.requester
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2);

                return (
                  <div key={item.id} className="approval-card">
                    <div className="approval-card__top">
                      <Avatar initials={initials} size="md" />
                      <div className="approval-card__meta">
                        <div className="approval-card__requester">{item.requester}</div>
                        <div className="approval-card__type">{item.requestType}</div>
                      </div>
                      <span
                        className={`approval-card__priority approval-card__priority--${item.priority?.toLowerCase() ?? 'normal'}`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <div className="approval-card__summary">{item.summary}</div>

                    <div className="approval-card__footer">
                      <span className="approval-card__time">{item.submitted}</span>

                      {item.status === 'Pending' ? (
                        <div className="approval-card__actions">
                          <button
                            type="button"
                            className="approval-card__btn-reject"
                            onClick={() => handleReject(item.id)}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="approval-card__btn-approve"
                            onClick={() => handleApprove(item.id)}
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`approval-card__status-badge is-${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="approvals-empty">
                  <span className="approvals-empty__icon">
                    <BezentIcon name="check" size={32} color="#059669" active />
                  </span>
                  <h3 className="approvals-empty__title">No requests found</h3>
                  <p className="approvals-empty__desc">
                    There are no {statusFilter.toLowerCase()} approval requests in this view.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApprovalsPage;
