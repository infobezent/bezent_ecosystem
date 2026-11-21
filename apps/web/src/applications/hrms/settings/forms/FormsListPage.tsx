import React, { useEffect, useState } from 'react';
import { useNavigate, useInRouterContext, type NavigateFunction } from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  Inline,
  Input,
  LoadingState,
  Modal,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  createForm,
  fetchFormsList,
  fetchResolvedForm,
  FormsApiError,
  type SystemFormSummary,
} from '../api/formsApi';

interface FormListItem extends SystemFormSummary {
  status: 'published' | 'draft' | 'disabled';
  version: number;
  sectionsCount: number;
}

interface FormsListPageInnerProps {
  navigate: NavigateFunction | ((to: string) => void);
}

function FormsListPageInner({ navigate }: FormsListPageInnerProps) {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await fetchFormsList();
      const withStatus = await Promise.all(
        summaries.map(async (summary) => {
          try {
            const resolved = await fetchResolvedForm(summary.key);
            const intakeConfig = resolved.form.metadata?.intakeConfig;
            return {
              ...summary,
              status: intakeConfig?.status ?? 'draft',
              version: intakeConfig?.publishedVersion ?? resolved.form.version,
              sectionsCount: resolved.sections.length,
            };
          } catch {
            return { ...summary, status: 'draft' as const, version: 0, sectionsCount: 0 };
          }
        }),
      );
      setForms(withStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleOpenBuilder = (form: FormListItem) => {
    navigate(`/hrms/settings/forms/${form.key}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createForm(newFormName.trim(), newFormDescription.trim() || undefined);
      setIsCreateModalOpen(false);
      setNewFormName('');
      setNewFormDescription('');
      navigate(`/hrms/settings/forms/${created.key}`);
    } catch (err) {
      setCreateError(
        err instanceof FormsApiError
          ? (Object.values(err.details ?? {})[0] ?? err.message)
          : 'Failed to create the form.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading forms..." />;
  }

  return (
    <div className="bezent-cif-management">
      {error && (
        <Alert variant="warning" title="Sync Notice">
          {error}
        </Alert>
      )}

      <div className="bezent-cif-cards-grid">
        {forms.map((form) => (
          <div
            key={form.key}
            className="bezent-cif-card"
            onClick={() => handleOpenBuilder(form)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenBuilder(form)}
            title={`Configure ${form.name}`}
            aria-label={`Configure ${form.name}`}
          >
            <div className="bezent-cif-card__status-capsule" title={`Status: ${form.status}`}>
              <span
                className={`bezent-cif-card__status-dot bezent-cif-card__status-dot--${form.status}`}
                aria-label={`Status: ${form.status}`}
              />
            </div>

            <div className="bezent-cif-card__icon" aria-hidden="true">
              <BezentIcon name="document" size={22} />
            </div>

            <h3 className="bezent-cif-card__name">{form.name}</h3>

            <span className="bezent-sr-only">
              {form.status === 'published' ? 'Published' : form.status}
            </span>
          </div>
        ))}

        <div
          className="bezent-cif-card bezent-cif-card--add"
          onClick={() => setIsCreateModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsCreateModalOpen(true)}
          title="Create a new form"
          aria-label="Create a new form"
        >
          <BezentIcon name="add" size={24} />
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateError(null);
        }}
        title="Create New Form"
        size="sm"
      >
        <form onSubmit={handleCreateSubmit}>
          <Stack gap="md">
            {createError && (
              <Alert variant="danger" title="Couldn't create this form">
                {createError}
              </Alert>
            )}
            <FormField label="Form Name" required>
              <Input
                type="text"
                placeholder="e.g. Contractor Intake Form"
                value={newFormName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewFormName(e.target.value)
                }
                autoFocus
              />
            </FormField>
            <FormField label="Description">
              <Input
                type="text"
                placeholder="What this form collects, and when it's used"
                value={newFormDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewFormDescription(e.target.value)
                }
              />
            </FormField>
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                type="button"
                disabled={isCreating}
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isCreating || !newFormName.trim()}>
                {isCreating ? 'Creating...' : 'Create Form'}
              </Button>
            </Inline>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}

function RoutedFormsListPage() {
  const navigate = useNavigate();
  return <FormsListPageInner navigate={navigate} />;
}

export function FormsListPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedFormsListPage />;
  }
  return <FormsListPageInner navigate={() => {}} />;
}

export default FormsListPage;
