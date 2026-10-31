import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  FormField,
  Inline,
  Modal,
  Stack,
  Tabs,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EngagementTouchpoint, TalentProfile } from '../types/talentPool';
import { formatConsentBadge, formatTalentStatusPill } from './TalentTable';

export interface TalentProfileModalProps {
  profile: TalentProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onReEngage: (profile: TalentProfile) => void;
  onAddTouchpoint?: (talentId: string, touchpoint: EngagementTouchpoint) => void;
}

export function TalentProfileModal({
  profile,
  isOpen,
  onClose,
  onReEngage,
  onAddTouchpoint,
}: TalentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'privacy'>('overview');
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  if (!profile) return null;

  const handleSaveNote = () => {
    if (!newNote.trim() || !onAddTouchpoint) return;
    const touchpoint: EngagementTouchpoint = {
      id: `eng-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'note',
      summary: newNote.trim(),
      contactedBy: 'Recruiter Admin',
    };
    onAddTouchpoint(profile.id, touchpoint);
    setNewNote('');
    setIsAddingNote(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="candidates" size="action" />
          <span>{profile.fullName}</span>
          {profile.source === 'silver_medalist' && (
            <Badge variant="info" size="sm">★ Silver Medalist</Badge>
          )}
          {formatTalentStatusPill(profile.status)}
        </Inline>
      }
      description={
        <Inline align="center" gap="md" wrap>
          <span>{profile.currentTitle} at <strong>{profile.currentCompany}</strong></span>
          <span>•</span>
          <span>{profile.experienceYears} Years Exp</span>
          <span>•</span>
          <span>Rating: <strong>{profile.rating} / 5</strong></span>
        </Inline>
      }
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Talent ID: {profile.talentNumber} • Email: {profile.email}
          </span>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onReEngage(profile);
                onClose();
              }}
            >
              Re-Engage &amp; Fast-Track
            </Button>
          </Inline>
        </Inline>
      }
    >
      <Stack gap="lg">
        <Tabs
          items={[
            { id: 'overview', label: 'Talent Summary & Skills' },
            { id: 'history', label: `Engagement History (${profile.engagementHistory.length})` },
            { id: 'privacy', label: 'Consent & Retention Compliance' },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <Stack gap="md">
            {/* Contact & Company */}
            <Card variant="flat" padding="md">
              <CardBody>
                <Inline align="center" gap="md">
                  <Avatar
                    initials={profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    color={profile.avatarColor}
                    size="lg"
                  />
                  <Stack gap="none">
                    <span className="bezent-text-base bezent-font-semibold">{profile.fullName}</span>
                    <span className="bezent-text-xs bezent-text-secondary">{profile.email} • {profile.phone}</span>
                    <span className="bezent-text-xs bezent-text-secondary">{profile.location}</span>
                  </Stack>
                </Inline>
              </CardBody>
            </Card>

            {/* Previous Requisition History */}
            <Card variant="tint-blue" padding="md">
              <CardBody>
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <span className="bezent-font-semibold bezent-text-sm">
                      Previous Application Context
                    </span>
                    <Badge variant="neutral" size="sm">Requisition: {profile.previousApplication.jobTitle}</Badge>
                  </Inline>
                  <p className="bezent-text-xs text-gray-700">
                    Candidate reached <strong>{profile.previousApplication.lastStageReached}</strong> on {profile.previousApplication.appliedDate}.
                  </p>
                  {profile.previousApplication.notes && (
                    <div className="bg-white p-2 rounded text-xs text-gray-600 border border-blue-100 mt-1">
                      &quot;{profile.previousApplication.notes}&quot;
                    </div>
                  )}
                </Stack>
              </CardBody>
            </Card>

            {/* Skills & Tags */}
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="sm">
                  <span className="bezent-font-semibold bezent-text-sm">Skill Set &amp; Talent Tags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="bg-blue-50 text-blue-800 text-xs px-2.5 py-1 rounded font-medium">
                        {skill}
                      </span>
                    ))}
                    {profile.tags.map((tag) => (
                      <Badge key={tag} variant="neutral" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        )}

        {/* Tab 2: Engagement History */}
        {activeTab === 'history' && (
          <Stack gap="md">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold bezent-text-sm">Nurturing &amp; Contact Touchpoints</span>
              <Button size="sm" variant="secondary" onClick={() => setIsAddingNote(!isAddingNote)}>
                {isAddingNote ? 'Cancel' : 'Log Touchpoint'}
              </Button>
            </Inline>

            {isAddingNote && (
              <Card variant="flat" padding="md">
                <CardBody>
                  <Stack gap="sm">
                    <FormField label="Touchpoint Summary / Meeting Note">
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Log email conversation, phone discussion, or interest in new roles..."
                        rows={2}
                      />
                    </FormField>
                    <Inline justify="end" gap="xs">
                      <Button size="sm" variant="primary" onClick={handleSaveNote}>
                        Save Note
                      </Button>
                    </Inline>
                  </Stack>
                </CardBody>
              </Card>
            )}

            <div className="space-y-2">
              {profile.engagementHistory.map((eng) => (
                <Card key={eng.id} variant="flat" padding="sm">
                  <CardBody>
                    <Inline justify="between" align="center">
                      <Inline align="center" gap="sm">
                        <span className="text-xs uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {eng.type}
                        </span>
                        <span className="bezent-text-xs bezent-font-semibold text-gray-800">
                          {eng.summary}
                        </span>
                      </Inline>
                      <span className="bezent-text-xs bezent-text-secondary">
                        {eng.date} by {eng.contactedBy}
                      </span>
                    </Inline>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Stack>
        )}

        {/* Tab 3: Consent & Privacy */}
        {activeTab === 'privacy' && (
          <Stack gap="md">
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <span className="bezent-font-semibold bezent-text-sm">Data Retention Policy &amp; DPDP Consent</span>
                    {formatConsentBadge(profile.consentStatus, profile.consentExpiryDate)}
                  </Inline>
                  <Divider />
                  <p className="bezent-text-xs text-gray-700">
                    Candidate granted consent for talent pool retention under <strong>{profile.retentionPolicy}</strong>.
                    Per statutory regulations, consent expires on <strong>{profile.consentExpiryDate}</strong>.
                  </p>
                  {profile.consentStatus === 'consent_expiring_soon' && (
                    <Alert variant="warning">
                      Consent expires within 30 days. An automated re-consent link has been dispatched to {profile.email}.
                    </Alert>
                  )}
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
