import { useEffect, useState } from 'react';
import {
  Actions,
  Alert,
  Button,
  Grid,
  Input,
  Modal,
  Select,
  Stack,
} from '../../../../design-system/components';
import { fetchEmployees, type EmployeeRecord } from '../../employees/api/employeesApi';
import {
  createDocument,
  type CreateEmployeeDocumentInput,
  type DocumentCategory,
} from '../../documents/api/documentsApi';
import { CATEGORY_LABELS } from '../../documents/model/documentModel';

export interface NewRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewRecordModal({ isOpen, onClose, onSuccess }: NewRecordModalProps) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('personal_identity');
  const [documentName, setDocumentName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEmployeesLoading(true);
    fetchEmployees({ pageSize: 100 })
      .then((res) => setEmployees(res.data))
      .catch(() => setEmployees([]))
      .finally(() => setEmployeesLoading(false));
  }, [isOpen]);

  const resetForm = () => {
    setEmployeeId('');
    setCategory('personal_identity');
    setDocumentName('');
    setDocumentNumber('');
    setExpiryDate('');
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setError('Please select an employee.');
      return;
    }
    if (!documentName.trim()) {
      setError('Please enter a document / record name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreateEmployeeDocumentInput = {
        employeeId,
        category,
        documentName: documentName.trim(),
        documentNumber: documentNumber.trim() || null,
        expiryDate: expiryDate.trim() || null,
      };

      await createDocument(payload);
      resetForm();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      title="Upload / Register Record"
      footer={
        <Actions align="end">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || employeesLoading}
          >
            {submitting ? 'Saving…' : 'Save Record'}
          </Button>
        </Actions>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Alert variant="info" title="Employee Record Registration">
            Record metadata is linked directly to the employee&apos;s workforce profile and
            compliance record. Binary file attachment storage will be activated in the upcoming
            storage phase.
          </Alert>

          {error && (
            <Alert variant="error" title="Submission Error">
              {error}
            </Alert>
          )}

          <Stack gap="xs">
            <label htmlFor="record-employee" className="bezent-filter-label">
              Employee{' '}
              <span className="bezent-label__required" aria-hidden="true">
                *
              </span>
            </label>
            <Select
              id="record-employee"
              aria-label="Select Employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={employeesLoading}
              options={[
                {
                  value: '',
                  label: employeesLoading ? 'Loading employees…' : 'Select an employee…',
                },
                ...employees.map((emp) => ({
                  value: emp.id,
                  label: `${emp.firstName} ${emp.lastName ?? ''} (${emp.employeeNumber}) · ${
                    emp.departmentName ?? 'No Dept'
                  }`,
                })),
              ]}
            />
          </Stack>

          <Stack gap="xs">
            <label htmlFor="record-category" className="bezent-filter-label">
              Record Category{' '}
              <span className="bezent-label__required" aria-hidden="true">
                *
              </span>
            </label>
            <Select
              id="record-category"
              aria-label="Record Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              options={(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => ({
                value: cat,
                label: CATEGORY_LABELS[cat],
              }))}
            />
          </Stack>

          <Stack gap="xs">
            <label htmlFor="record-name" className="bezent-filter-label">
              Document / Record Name{' '}
              <span className="bezent-label__required" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="record-name"
              placeholder="e.g. Passport, PAN Card, Degree Certificate"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              required
            />
          </Stack>

          <Grid columns={2} gap="md">
            <Stack gap="xs">
              <label htmlFor="record-number" className="bezent-filter-label">
                Document Number / Ref
              </label>
              <Input
                id="record-number"
                placeholder="e.g. P1234567"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </Stack>

            <Stack gap="xs">
              <label htmlFor="record-expiry" className="bezent-filter-label">
                Expiry Date
              </label>
              <Input
                id="record-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </Stack>
          </Grid>
        </Stack>
      </form>
    </Modal>
  );
}
