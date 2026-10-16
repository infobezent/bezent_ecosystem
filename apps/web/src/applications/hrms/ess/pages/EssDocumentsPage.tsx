import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  Toolbar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
  FormSection,
  FormGrid,
  EmptyState,
  Select,
  Input,
  Divider,
  type BadgeVariant,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { essApi, type EssDocument } from '../api/essApi';

const CATEGORY_OPTIONS: Array<{ value: EssDocument['category']; label: string }> = [
  { value: 'personal_identity', label: 'Personal Identity (Passport, PAN, Aadhaar)' },
  { value: 'address_proof', label: 'Address Proof (Electricity bill, Rent agreement)' },
  { value: 'education', label: 'Education Certificates (Degree, Marksheets)' },
  { value: 'previous_employment', label: 'Previous Employment (Relieving letter, Payslips)' },
  { value: 'bank_payroll', label: 'Bank & Payroll (Cancelled cheque, Passbook)' },
  { value: 'tax_other', label: 'Tax & Other Documents (Form 16, Declarations)' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'personal_identity', label: 'Personal Identity' },
  { value: 'address_proof', label: 'Address Proof' },
  { value: 'education', label: 'Education' },
  { value: 'previous_employment', label: 'Previous Employment' },
  { value: 'bank_payroll', label: 'Bank & Payroll' },
  { value: 'tax_other', label: 'Tax & Other' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resubmission_required', label: 'Action Required' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export function EssDocumentsPage() {
  const [documents, setDocuments] = useState<EssDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal
  const [selectedDoc, setSelectedDoc] = useState<EssDocument | null>(null);

  // Form state
  const [category, setCategory] = useState<EssDocument['category']>('personal_identity');
  const [documentName, setDocumentName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getDocuments();
      setDocuments(data.documents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    setUploadLoading(true);
    setUploadError(null);
    try {
      if (!documentName.trim()) {
        throw new Error('Document name is required');
      }
      await essApi.uploadDocument({
        category,
        documentName: documentName.trim(),
        documentNumber: documentNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
      });
      setSuccessMsg(`"${documentName}" uploaded and queued for HR verification.`);
      setUploadOpen(false);
      setDocumentName('');
      setDocumentNumber('');
      setExpiryDate('');
      await load();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  const statusVariant = (status: EssDocument['status']): BadgeVariant => {
    if (status === 'verified') return 'success';
    if (status === 'rejected' || status === 'expired') return 'danger';
    if (status === 'under_review') return 'info';
    if (status === 'resubmission_required') return 'warning';
    return 'neutral';
  };

  const categoryLabel = (c: EssDocument['category']): string =>
    c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

  // Metrics
  const totalCount = documents.length;
  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const underReviewCount = documents.filter((d) => d.status === 'under_review').length;
  const actionRequiredCount = documents.filter(
    (d) =>
      d.status === 'resubmission_required' || d.status === 'rejected' || d.status === 'expired',
  ).length;

  // Filtered List
  const filteredDocuments = useMemo(() => {
    return documents.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
  }, [documents, categoryFilter, statusFilter]);

  if (loading) return <LoadingState label="Loading documents..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  return (
    <Page>
      <PageHeader
        title="My Documents"
        subtitle="Secure employee document repository, statutory IDs, educational degrees, and HR verification status"
        actions={
          <Button
            id="ess-upload-document-btn"
            variant="primary"
            leftIcon={<BezentIcon name="plus" size={16} />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Document
          </Button>
        }
      />

      {successMsg && (
        <Alert variant="success" title="Success">
          {successMsg}
        </Alert>
      )}

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <Section title="Document Verification Vault">
        <Grid columns={4} gap="md">
          <Card variant="default">
            <Stack gap="xs">
              <span>Total Documents</span>
              <strong>{totalCount}</strong>
              <span>Uploaded to vault</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Verified & Approved</span>
              <strong>{verifiedCount}</strong>
              <span>Official HR verified</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Under Review</span>
              <strong>{underReviewCount}</strong>
              <span>Pending verification</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Action Required</span>
              <strong>{actionRequiredCount}</strong>
              <span>Re-upload / expired</span>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* ── Documents Table ───────────────────────────────────────── */}
      <Section title="Document Ledger">
        <Stack gap="md">
          <Toolbar
            left={
              <Inline gap="sm" align="center">
                <Select
                  size="sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={CATEGORY_FILTER_OPTIONS}
                />
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={STATUS_FILTER_OPTIONS}
                />
              </Inline>
            }
            right={
              <span>
                Showing <strong>{filteredDocuments.length}</strong> document(s)
              </span>
            }
          />

          {filteredDocuments.length === 0 ? (
            <EmptyState
              title="No Documents Found"
              description={
                totalCount === 0
                  ? 'No documents have been uploaded yet. Click "Upload Document" to add your identity proofs, educational degrees, or certificates.'
                  : 'No documents match your selected filters.'
              }
              primaryAction={{ label: 'Upload Document', onClick: () => setUploadOpen(true) }}
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Document Name</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Document Number</TableHeaderCell>
                    <TableHeaderCell>Expiry Date</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <BezentIcon name="documents" size={16} />
                          <strong>{doc.documentName}</strong>
                        </Inline>
                      </TableCell>
                      <TableCell>{categoryLabel(doc.category)}</TableCell>
                      <TableCell>{doc.documentNumber ?? '—'}</TableCell>
                      <TableCell>{doc.expiryDate ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(doc.status)}>
                          {doc.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      </Section>

      {/* ── Upload Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={uploadOpen}
        title="Upload Verification Document"
        onClose={() => setUploadOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button id="doc-upload-cancel" variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              id="doc-upload-submit"
              variant="primary"
              onClick={handleUpload}
              loading={uploadLoading}
              disabled={!documentName.trim()}
            >
              Upload Document
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {uploadError && (
            <Alert variant="error" title="Error">
              {uploadError}
            </Alert>
          )}
          <FormSection title="Document Information">
            <FormGrid columns={1}>
              <Select
                label="Document Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EssDocument['category'])}
                options={CATEGORY_OPTIONS}
              />

              <Input
                label="Document Name"
                placeholder="e.g., Aadhaar Card, Passport, Degree Certificate"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />

              <Grid columns={2} gap="md">
                <Input
                  label="Document Number (Optional)"
                  placeholder="e.g., XXXX-XXXX-1234"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />

                <Input
                  label="Expiry Date (If applicable)"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Grid>
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Document Details Modal ─────────────────────────────────── */}
      {selectedDoc && (
        <Modal
          isOpen={true}
          title={`Document Details — ${selectedDoc.documentName}`}
          onClose={() => setSelectedDoc(null)}
          footer={
            <Button variant="secondary" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
          }
        >
          <Stack gap="md">
            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <span>Category</span>
                <strong>{categoryLabel(selectedDoc.category)}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Verification Status</span>
                <Badge variant={statusVariant(selectedDoc.status)}>
                  {selectedDoc.status.toUpperCase()}
                </Badge>
              </Stack>
              <Stack gap="xs">
                <span>Document Number</span>
                <strong>{selectedDoc.documentNumber || '—'}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Expiry Date</span>
                <span>{selectedDoc.expiryDate || 'No expiration'}</span>
              </Stack>
              <Stack gap="xs">
                <span>Uploaded On</span>
                <span>{new Date(selectedDoc.createdAt).toLocaleDateString()}</span>
              </Stack>
            </Grid>
            <Divider />
            <Alert variant="info" title="Verified Document Vault">
              This document is encrypted and stored in your tenant secure vault for HR and statutory
              compliance.
            </Alert>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
