import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeChangeRequest, CompanyPolicy } from '../types/settingsCenter';

const INITIAL_REQUESTS: EmployeeChangeRequest[] = [
  {
    id: 'req_1',
    employeeId: 'EMP-102',
    employeeName: 'Sarah Jenkins',
    fieldLabel: 'Emergency Phone Number',
    oldValue: '+1 555-0142',
    requestedValue: '+1 555-0199',
    requestDate: '2026-09-20',
    status: 'Pending',
    reason: 'Updated primary emergency contact phone number.',
  },
  {
    id: 'req_2',
    employeeId: 'EMP-108',
    employeeName: 'Marcus Vance',
    fieldLabel: 'Residential Address',
    oldValue: '742 Evergreen Terrace, Sector 4',
    requestedValue: '124 Conch Street, Suite 2B',
    requestDate: '2026-09-18',
    status: 'Pending',
    reason: 'Relocated to new apartment.',
  },
  {
    id: 'req_3',
    employeeId: 'EMP-115',
    employeeName: 'Anita Roy',
    fieldLabel: 'Bank Account Number',
    oldValue: 'XXXX-XXXX-4812',
    requestedValue: 'XXXX-XXXX-9921',
    requestDate: '2026-09-15',
    status: 'Approved',
  },
];

const INITIAL_POLICIES: CompanyPolicy[] = [
  {
    id: 'pol_1',
    title: 'Code of Conduct & Workplace Ethics',
    category: 'General Governance',
    effectiveDate: '2026-01-01',
    status: 'Published',
    documentName: 'Code_Of_Conduct_v2.pdf',
  },
  {
    id: 'pol_2',
    title: 'Remote Work & Hybrid Guidelines',
    category: 'Workplace & Attendance',
    effectiveDate: '2026-03-15',
    status: 'Published',
    documentName: 'Remote_Work_Policy_2026.pdf',
  },
  {
    id: 'pol_3',
    title: 'IT Asset Security & Data Privacy',
    category: 'Security & Assets',
    effectiveDate: '2026-06-01',
    status: 'Published',
    documentName: 'Data_Security_Policy.pdf',
  },
];

export function HRSettingsSection() {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'policies'>('requests');

  // Requests state
  const [requests, setRequests] = useState<EmployeeChangeRequest[]>(INITIAL_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeChangeRequest | null>(null);

  // Policies state
  const [policies, setPolicies] = useState<CompanyPolicy[]>(INITIAL_POLICIES);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyCategory, setPolicyCategory] = useState('General Governance');
  const [policyEffectiveDate, setPolicyEffectiveDate] = useState('2026-10-01');
  const [policyDocName, setPolicyDocName] = useState('');

  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Request actions
  const handleApproveRequest = (id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r)));
    setSelectedRequest(null);
    setAlertMsg('Employee information request approved and updated.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleRejectRequest = (id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r)));
    setSelectedRequest(null);
    setAlertMsg('Employee change request rejected.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // Policy actions
  const handleOpenAddPolicy = () => {
    setEditingPolicyId(null);
    setPolicyTitle('');
    setPolicyCategory('General Governance');
    setPolicyEffectiveDate('2026-10-01');
    setPolicyDocName('');
    setShowPolicyModal(true);
  };

  const handleOpenEditPolicy = (p: CompanyPolicy) => {
    setEditingPolicyId(p.id);
    setPolicyTitle(p.title);
    setPolicyCategory(p.category);
    setPolicyEffectiveDate(p.effectiveDate);
    setPolicyDocName(p.documentName || '');
    setShowPolicyModal(true);
  };

  const handleSavePolicy = () => {
    if (!policyTitle.trim()) return;
    if (editingPolicyId) {
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === editingPolicyId
            ? {
                ...p,
                title: policyTitle.trim(),
                category: policyCategory,
                effectiveDate: policyEffectiveDate,
                documentName: policyDocName || 'Policy_Document.pdf',
              }
            : p,
        ),
      );
    } else {
      const newP: CompanyPolicy = {
        id: `pol_${Date.now()}`,
        title: policyTitle.trim(),
        category: policyCategory,
        effectiveDate: policyEffectiveDate,
        status: 'Published',
        documentName: policyDocName || 'Policy_Document.pdf',
      };
      setPolicies((prev) => [...prev, newP]);
    }
    setShowPolicyModal(false);
    setAlertMsg('Company policy saved.');
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleTogglePolicyStatus = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === 'Published' ? 'Draft' : 'Published' } : p,
      ),
    );
  };

  const handleDeletePolicy = (id: string) => {
    if (confirm('Delete this company policy?')) {
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">HR Settings & Governance</h2>
          <p className="settings-section__subtitle">
            Manage employee information change requests and company policy documents.
          </p>
        </div>
        <div className="settings-sub-tab-strip">
          <button
            type="button"
            className={`settings-sub-tab ${activeSubTab === 'requests' ? 'settings-sub-tab--active' : ''}`}
            onClick={() => setActiveSubTab('requests')}
          >
            Employee Change Requests ({requests.filter((r) => r.status === 'Pending').length}{' '}
            Pending)
          </button>
          <button
            type="button"
            className={`settings-sub-tab ${activeSubTab === 'policies' ? 'settings-sub-tab--active' : ''}`}
            onClick={() => setActiveSubTab('policies')}
          >
            Company Policies ({policies.length})
          </button>
        </div>
      </div>

      {alertMsg && (
        <div className="settings-alert settings-alert--success">
          <BezentIcon name="checkMark" size={16} />
          <span>{alertMsg}</span>
        </div>
      )}

      {/* Sub-tab 1: Change Requests */}
      {activeSubTab === 'requests' && (
        <div className="settings-card">
          <h3 className="settings-card__title">Employee Profile Change Requests</h3>
          <p className="settings-card__desc">
            Review requested updates from Employee Self-Service (ESS).
          </p>

          <table className="settings-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Field Label</th>
                <th>Current Value</th>
                <th>Requested Value</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <strong>{req.employeeName}</strong>
                    <div className="text-muted">{req.employeeId}</div>
                  </td>
                  <td>{req.fieldLabel}</td>
                  <td>
                    <span className="text-muted">{req.oldValue}</span>
                  </td>
                  <td>
                    <span className="text-highlight">{req.requestedValue}</span>
                  </td>
                  <td>{req.requestDate}</td>
                  <td>
                    <span
                      className={`settings-badge ${
                        req.status === 'Approved'
                          ? 'settings-badge--req'
                          : req.status === 'Rejected'
                            ? 'settings-badge--muted'
                            : 'settings-badge--info'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td>
                    {req.status === 'Pending' ? (
                      <div className="settings-action-row">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="btn-primary-blue"
                          onClick={() => handleApproveRequest(req.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="btn-restrained-danger"
                          onClick={() => handleRejectRequest(req.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="btn-subtle-secondary"
                        onClick={() => setSelectedRequest(req)}
                      >
                        View Log
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sub-tab 2: Company Policies */}
      {activeSubTab === 'policies' && (
        <div className="settings-card">
          <div className="settings-card__header-row">
            <div>
              <h3 className="settings-card__title">Company Policies & SOP Documents</h3>
              <p className="settings-card__desc">
                Publish organizational guidelines, terms, and employee handbooks.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="btn-light-blue-action"
              onClick={handleOpenAddPolicy}
            >
              + Create Policy
            </Button>
          </div>

          <table className="settings-table">
            <thead>
              <tr>
                <th>Policy Title</th>
                <th>Category</th>
                <th>Effective Date</th>
                <th>Document</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((pol) => (
                <tr key={pol.id}>
                  <td>
                    <strong>{pol.title}</strong>
                  </td>
                  <td>{pol.category}</td>
                  <td>{pol.effectiveDate}</td>
                  <td>
                    <span className="policy-doc-link">
                      <BezentIcon name="documents" size={14} />
                      {pol.documentName}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`settings-badge ${
                        pol.status === 'Published' ? 'settings-badge--req' : 'settings-badge--muted'
                      }`}
                      onClick={() => handleTogglePolicyStatus(pol.id)}
                    >
                      {pol.status}
                    </button>
                  </td>
                  <td>
                    <div className="settings-action-row">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="btn-subtle-secondary"
                        onClick={() => handleOpenEditPolicy(pol)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="btn-restrained-danger"
                        onClick={() => handleDeletePolicy(pol.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal">
            <div className="settings-modal__header">
              <h3>{editingPolicyId ? 'Edit Policy' : 'Create Company Policy'}</h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setShowPolicyModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="settings-modal__body">
              <div className="settings-field-group">
                <label className="settings-label">Policy Title *</label>
                <input
                  type="text"
                  className="settings-input"
                  value={policyTitle}
                  onChange={(e) => setPolicyTitle(e.target.value)}
                  placeholder="e.g. Code of Conduct"
                />
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Category</label>
                <select
                  className="settings-input"
                  value={policyCategory}
                  onChange={(e) => setPolicyCategory(e.target.value)}
                >
                  <option value="General Governance">General Governance</option>
                  <option value="Workplace & Attendance">Workplace & Attendance</option>
                  <option value="Security & Assets">Security & Assets</option>
                  <option value="Compensation & Benefits">Compensation & Benefits</option>
                </select>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Effective Date</label>
                <input
                  type="date"
                  className="settings-input"
                  value={policyEffectiveDate}
                  onChange={(e) => setPolicyEffectiveDate(e.target.value)}
                />
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Policy Document File</label>
                <input
                  type="text"
                  className="settings-input"
                  placeholder="e.g. Policy_Document_2026.pdf"
                  value={policyDocName}
                  onChange={(e) => setPolicyDocName(e.target.value)}
                />
              </div>
            </div>
            <div className="settings-modal__footer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="btn-subtle-secondary"
                onClick={() => setShowPolicyModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="btn-primary-blue"
                onClick={handleSavePolicy}
              >
                Save Policy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Log Modal */}
      {selectedRequest && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal">
            <div className="settings-modal__header">
              <h3>Change History Details</h3>
              <button
                type="button"
                className="settings-modal__close"
                onClick={() => setSelectedRequest(null)}
              >
                ✕
              </button>
            </div>
            <div className="settings-modal__body">
              <p>
                <strong>Employee:</strong> {selectedRequest.employeeName} (
                {selectedRequest.employeeId})
              </p>
              <p>
                <strong>Field:</strong> {selectedRequest.fieldLabel}
              </p>
              <p>
                <strong>Old Value:</strong> {selectedRequest.oldValue}
              </p>
              <p>
                <strong>Approved Value:</strong> {selectedRequest.requestedValue}
              </p>
              <p>
                <strong>Request Date:</strong> {selectedRequest.requestDate}
              </p>
              <p>
                <strong>Status:</strong> {selectedRequest.status}
              </p>
            </div>
            <div className="settings-modal__footer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="btn-subtle-secondary"
                onClick={() => setSelectedRequest(null)}
              >
                Close Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
