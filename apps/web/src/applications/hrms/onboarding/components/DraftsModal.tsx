import {
  Modal,
  Button,
  Badge,
  Card,
  EmptyState,
  Actions,
  Toolbar,
  Stack,
  Inline,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { type RegistrationSectionId, REGISTRATION_SECTIONS } from './EmployeeRegistration';
import type { ReviewSectionData } from './ReviewSection';

export interface EmployeeRegistrationDraft {
  id: string;
  employeeId: string;
  employeeName: string;
  activeSection: RegistrationSectionId;
  completedSectionsCount: number;
  pendingSectionLabels: string[];
  lastUpdated: string;
  reviewData: ReviewSectionData;
}

interface DraftsModalProps {
  isOpen: boolean;
  drafts: EmployeeRegistrationDraft[];
  onClose: () => void;
  onContinueDraft: (draft: EmployeeRegistrationDraft) => void;
  onDeleteDraft: (draftId: string) => void;
}

export function DraftsModal({
  isOpen,
  drafts,
  onClose,
  onContinueDraft,
  onDeleteDraft,
}: DraftsModalProps) {
  if (!isOpen) return null;

  const confirmAndDeleteDraft = (draft: EmployeeRegistrationDraft) => {
    const title = draft.employeeName || draft.employeeId || 'this draft';
    if (window.confirm(`Delete ${title}? This action cannot be undone.`)) {
      onDeleteDraft(draft.id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Saved Registration Drafts"
      description={`${drafts.length} Saved`}
      size="lg"
      footer={
        <Actions align="end">
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
        </Actions>
      }
    >
      <Stack gap="md">
        {drafts.length === 0 ? (
          <EmptyState
            title="No Saved Drafts"
            description="When HR saves an incomplete employee registration using Save Draft, it will appear here for seamless continuation."
          />
        ) : (
          <Stack gap="md">
            {drafts.map((draft) => {
              const activeSectionObj = REGISTRATION_SECTIONS.find(
                (s) => s.id === draft.activeSection,
              );
              return (
                <Card key={draft.id} padding="md">
                  <Stack gap="sm">
                    <Toolbar
                      left={
                        <div>
                          <strong>{draft.employeeName || 'Unnamed Draft'}</strong>
                          <span className="bezent-card__desc"> (ID: {draft.employeeId})</span>
                        </div>
                      }
                      right={
                        <Badge variant="neutral" size="sm">
                          Draft
                        </Badge>
                      }
                    />

                    <Stack gap="xs">
                      <div className="bezent-card__desc">
                        <span>Current Section: </span>
                        <strong>{activeSectionObj?.label || 'General'}</strong>
                      </div>
                      <div className="bezent-card__desc">
                        <span>Progress: </span>
                        <strong>{draft.completedSectionsCount} / 10 Sections Completed</strong>
                      </div>
                      <div className="bezent-card__desc">
                        <span>Last Saved: </span>
                        <span>{draft.lastUpdated}</span>
                      </div>
                    </Stack>

                    {/* Pending Sections Chips */}
                    {draft.pendingSectionLabels.length > 0 && (
                      <Inline gap="xs" wrap align="center">
                        <span className="bezent-card__desc">Pending Sections:</span>
                        {draft.pendingSectionLabels.map((sec, idx) => (
                          <Badge key={idx} variant="warning" size="sm">
                            <BezentIcon name="warning" size={12} /> {sec}
                          </Badge>
                        ))}
                      </Inline>
                    )}

                    {/* Draft Actions */}
                    <Actions align="end" gap="sm">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => confirmAndDeleteDraft(draft)}
                      >
                        <BezentIcon name="delete" size={14} /> Delete Draft
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => onContinueDraft(draft)}
                      >
                        Continue Registration →
                      </Button>
                    </Actions>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

export default DraftsModal;
