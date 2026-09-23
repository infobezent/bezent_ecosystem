import { useState } from 'react';
import {
  Button,
  Card,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Modal,
  Input,
  Select,
  Alert,
  Toolbar,
  Actions,
  Stack,
} from '../../../../design-system/components';
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

const POLICY_CATEGORIES = [
  { value: 'General Governance', label: 'General Governance' },
  { value: 'Workplace & Attendance', label: 'Workplace & Attendance' },
  { value: 'Security & Assets', label: 'Security & Assets' },
  { value: 'Compensation & Benefits', label: 'Compensation & Benefits' },
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

  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;

  return (
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">HR Settings & Governance</h2>
            <p className="bezent-card__desc">
              Manage employee information change requests and company policy documents.
            </p>
          </div>
        }
        right={
          <Tabs
            items={[
              {
                id: 'requests',
                label: `Employee Change Requests (${pendingRequestsCount} Pending)`,
              },
              {
                id: 'policies',
                label: `Company Policies (${policies.length})`,
              },
            ]}
            activeId={activeSubTab}
            onChange={(id) => setActiveSubTab(id as 'requests' | 'policies')}
            variant="pills"
          />
        }
      />

      {alertMsg && <Alert variant="success">{alertMsg}</Alert>}

      {/* Sub-tab 1: Change Requests */}
      {activeSubTab === 'requests' && (
        <Card padding="lg">
          <Stack gap="md">
            <div>
              <h3 className="bezent-card__title">Employee Profile Change Requests</h3>
              <p className="bezent-card__desc">
                Review requested updates from Employee Self-Service (ESS).
              </p>
            </div>

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Field Label</TableHeaderCell>
                  <TableHeaderCell>Current Value</TableHeaderCell>
                  <TableHeaderCell>Requested Value</TableHeaderCell>
                  <TableHeaderCell>Request Date</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <strong>{req.employeeName}</strong>
                      <p className="bezent-card__desc">{req.employeeId}</p>
                    </TableCell>
                    <TableCell>{req.fieldLabel}</TableCell>
                    <TableCell>
                      <span className="bezent-card__desc">{req.oldValue}</span>
                    </TableCell>
                    <TableCell>
                      <strong>{req.requestedValue}</strong>
                    </TableCell>
                    <TableCell>{req.requestDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          req.status === 'Approved'
                            ? 'success'
                            : req.status === 'Rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.status === 'Pending' ? (
                        <Actions align="start" gap="xs">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveRequest(req.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectRequest(req.id)}
                          >
                            Reject
                          </Button>
                        </Actions>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedRequest(req)}
                        >
                          View Log
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Card>
      )}

      {/* Sub-tab 2: Company Policies */}
      {activeSubTab === 'policies' && (
        <Card padding="lg">
          <Stack gap="md">
            <Toolbar
              left={
                <div>
                  <h3 className="bezent-card__title">Company Policies & SOP Documents</h3>
                  <p className="bezent-card__desc">
                    Publish organizational guidelines, terms, and employee handbooks.
                  </p>
                </div>
              }
              right={
                <Button variant="primary" type="button" onClick={handleOpenAddPolicy}>
                  + Create Policy
                </Button>
              }
            />

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Policy Title</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Effective Date</TableHeaderCell>
                  <TableHeaderCell>Document</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies.map((pol) => (
                  <TableRow key={pol.id}>
                    <TableCell>
                      <strong>{pol.title}</strong>
                    </TableCell>
                    <TableCell>{pol.category}</TableCell>
                    <TableCell>{pol.effectiveDate}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">
                        <BezentIcon name="documents" size={14} /> {pol.documentName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleTogglePolicyStatus(pol.id)}
                        aria-label={`Toggle status for ${pol.title}`}
                      >
                        <Badge variant={pol.status === 'Published' ? 'success' : 'neutral'}>
                          {pol.status}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Actions align="start" gap="xs">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditPolicy(pol)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeletePolicy(pol.id)}
                        >
                          Delete
                        </Button>
                      </Actions>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        </Card>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <Modal
          isOpen={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          title={editingPolicyId ? 'Edit Policy' : 'Create Company Policy'}
          footer={
            <Actions align="end" gap="sm">
              <Button variant="secondary" type="button" onClick={() => setShowPolicyModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleSavePolicy}>
                Save Policy
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            <Input
              label="Policy Title *"
              value={policyTitle}
              onChange={(e) => setPolicyTitle(e.target.value)}
              placeholder="e.g. Code of Conduct"
              required
            />

            <Select
              label="Category"
              value={policyCategory}
              options={POLICY_CATEGORIES}
              onChange={(e) => setPolicyCategory(e.target.value)}
            />

            <Input
              label="Effective Date"
              type="date"
              value={policyEffectiveDate}
              onChange={(e) => setPolicyEffectiveDate(e.target.value)}
            />

            <Input
              label="Policy Document File"
              placeholder="e.g. Policy_Document_2026.pdf"
              value={policyDocName}
              onChange={(e) => setPolicyDocName(e.target.value)}
            />
          </Stack>
        </Modal>
      )}

      {/* Change Log Modal */}
      {selectedRequest && (
        <Modal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          title="Change History Details"
          footer={
            <Actions align="end">
              <Button variant="secondary" type="button" onClick={() => setSelectedRequest(null)}>
                Close Log
              </Button>
            </Actions>
          }
        >
          <Stack gap="sm">
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
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}

export default HRSettingsSection;
