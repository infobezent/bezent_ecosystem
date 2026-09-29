import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
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
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssDocument } from '../api/essApi';

export function EssDocumentsPage() {
  const [documents, setDocuments] = useState<EssDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  useEffect(() => { load(); }, [load]);

  const handleUpload = async () => {
    setUploadLoading(true);
    setUploadError(null);
    try {
      await essApi.uploadDocument({ category, documentName, documentNumber: documentNumber || undefined, expiryDate: expiryDate || undefined });
      setSuccessMsg(`"${documentName}" uploaded and queued for HR verification.`);
      setUploadOpen(false);
      setDocumentName(''); setDocumentNumber(''); setExpiryDate('');
      await load();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading documents..." />;
  if (error) return <Alert variant="error" title="Error" description={error} />;

  const statusVariant = (status: EssDocument['status']): string => {
    if (status === 'verified') return 'green';
    if (status === 'rejected' || status === 'expired') return 'red';
    if (status === 'under_review') return 'blue';
    if (status === 'resubmission_required') return 'yellow';
    return 'grey';
  };

  const categoryLabel = (c: EssDocument['category']): string =>
    c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

  return (
    <Page>
      <PageHeader
        title="My Documents"
        subtitle="Personal identity, education and employment documents"
        actions={
          <Button
            id="ess-upload-doc-btn"
            variant="primary"
            label="Upload Document"
            leadingIcon={<BezentIcon name="documents" size={16} />}
            onClick={() => setUploadOpen(true)}
          />
        }
      />

      {successMsg && <Alert variant="success" title="Uploaded" description={successMsg} />}

      <Section title="Document Vault">
        {documents.length === 0 ? (
          <EmptyState
            title="No Documents"
            description="Upload personal identity, address proof or employment documents for HR verification."
            primaryAction={{ label: 'Upload Document', onClick: () => setUploadOpen(true) }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Document Name</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Document Number</TableHeaderCell>
                <TableHeaderCell>Expiry Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Inline gap="sm" alignItems="center">
                      <BezentIcon name="documents" size={14} />
                      <span>{doc.documentName}</span>
                    </Inline>
                  </TableCell>
                  <TableCell>{categoryLabel(doc.category)}</TableCell>
                  <TableCell>{doc.documentNumber ?? '—'}</TableCell>
                  <TableCell>{doc.expiryDate ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)} label={doc.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadOpen}
        title="Upload Document"
        onClose={() => setUploadOpen(false)}
        footer={
          <Inline gap="sm">
            <Button id="doc-upload-cancel" variant="secondary" label="Cancel" onClick={() => setUploadOpen(false)} />
            <Button id="doc-upload-submit" variant="primary" label="Upload" onClick={handleUpload} loading={uploadLoading} />
          </Inline>
        }
      >
        <Stack gap="md">
          {uploadError && <Alert variant="error" title="Error" description={uploadError} />}
          <FormSection title="Document Details">
            <FormGrid columns={1}>
              <label>
                Category
                <select value={category} onChange={e => setCategory(e.target.value as EssDocument['category'])}>
                  <option value="personal_identity">Personal Identity</option>
                  <option value="address_proof">Address Proof</option>
                  <option value="education">Education</option>
                  <option value="previous_employment">Previous Employment</option>
                  <option value="bank_payroll">Bank / Payroll</option>
                  <option value="tax_other">Tax / Other</option>
                </select>
              </label>
              <label>Document Name<input value={documentName} onChange={e => setDocumentName(e.target.value)} placeholder="e.g., Aadhaar Card" /></label>
              <label>Document Number (optional)<input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="e.g., XXXX-XXXX-1234" /></label>
              <label>Expiry Date (optional)<input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></label>
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}
