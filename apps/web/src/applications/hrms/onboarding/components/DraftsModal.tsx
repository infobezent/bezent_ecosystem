import { BezentIcon } from '../../../../design-system/icons';
import { RegistrationSectionId, REGISTRATION_SECTIONS } from './EmployeeRegistration';
import { ReviewSectionData } from './ReviewSection';
import './DraftsModal.css';

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
    <div className="drafts-modal__overlay">
      <div className="drafts-modal__card">
        {/* Modal Header */}
        <div className="drafts-modal__header">
          <div className="drafts-modal__header-title-group">
            <BezentIcon name="documents" size={20} />
            <h3 className="drafts-modal__title">Saved Registration Drafts</h3>
            <span className="drafts-modal__count-badge">{drafts.length} Saved</span>
          </div>
          <button type="button" className="drafts-modal__close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="drafts-modal__body">
          {drafts.length === 0 ? (
            <div className="drafts-modal__empty-state">
              <BezentIcon name="documents" size={44} />
              <h4>No Saved Drafts</h4>
              <p>
                When HR saves an incomplete employee registration using <strong>Save Draft</strong>,
                it will appear here for seamless continuation.
              </p>
            </div>
          ) : (
            <div className="drafts-modal__list">
              {drafts.map((draft) => {
                const activeSectionObj = REGISTRATION_SECTIONS.find(
                  (s) => s.id === draft.activeSection,
                );
                return (
                  <div key={draft.id} className="drafts-modal__item-card">
                    <div className="drafts-modal__item-top">
                      <div className="drafts-modal__item-identity">
                        <span className="drafts-modal__item-name">
                          {draft.employeeName || 'Unnamed Draft'}
                        </span>
                        <span className="drafts-modal__item-id">ID: {draft.employeeId}</span>
                      </div>
                      <span className="drafts-modal__status-pill">Draft</span>
                    </div>

                    <div className="drafts-modal__item-details">
                      <div className="drafts-modal__detail-row">
                        <span className="drafts-modal__label">Current Section:</span>
                        <strong className="drafts-modal__val">
                          {activeSectionObj?.label || 'General'}
                        </strong>
                      </div>
                      <div className="drafts-modal__detail-row">
                        <span className="drafts-modal__label">Progress:</span>
                        <strong className="drafts-modal__val">
                          {draft.completedSectionsCount} / 10 Sections Completed
                        </strong>
                      </div>
                      <div className="drafts-modal__detail-row">
                        <span className="drafts-modal__label">Last Saved:</span>
                        <span className="drafts-modal__val-muted">{draft.lastUpdated}</span>
                      </div>
                    </div>

                    {/* Pending Sections Chips */}
                    {draft.pendingSectionLabels.length > 0 && (
                      <div className="drafts-modal__pending-chips-row">
                        <span className="drafts-modal__pending-label">Pending Sections:</span>
                        <div className="drafts-modal__chips-flex">
                          {draft.pendingSectionLabels.map((sec, idx) => (
                            <span key={idx} className="drafts-modal__pending-chip">
                              ⚠ {sec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Draft Actions */}
                    <div className="drafts-modal__item-actions">
                      <button
                        type="button"
                        className="drafts-modal__delete-btn"
                        onClick={() => confirmAndDeleteDraft(draft)}
                      >
                        🗑 Delete Draft
                      </button>
                      <button
                        type="button"
                        className="drafts-modal__continue-btn"
                        onClick={() => onContinueDraft(draft)}
                      >
                        Continue Registration →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="drafts-modal__footer">
          <button type="button" className="employee-registration__cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
