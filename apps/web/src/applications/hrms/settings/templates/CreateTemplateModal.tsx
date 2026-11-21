import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Textarea,
  FormField,
  Select,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { TemplateCategory } from './types';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: TemplateCategory;
  onCreate: (name: string, description: string, typeOrCategory: string) => void;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  category,
  onCreate,
}: CreateTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subType, setSubType] = useState('');

  const categoryLabels: Record<TemplateCategory, string> = {
    forms: 'Candidate & Employee Form',
    emails: 'Email Notification Template',
    letters: 'Official Letter Format',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim(), subType);
    setName('');
    setDescription('');
    setSubType('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create New ${categoryLabels[category]}`}
      size="md"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} type="submit" disabled={!name.trim()}>
            <BezentIcon name="add" size={16} />
            Create
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <FormField label="Template Title" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., ${
                category === 'forms'
                  ? 'Intern Registration Form'
                  : category === 'emails'
                    ? 'Annual Bonus Notification'
                    : 'Non-Disclosure & IP Agreement'
              }`}
              autoFocus
            />
          </FormField>

          {category === 'emails' && (
            <FormField label="Lifecycle Category" required>
              <Select
                value={subType || 'onboarding'}
                onChange={(e) => setSubType(e.target.value)}
                options={[
                  { value: 'onboarding', label: 'Onboarding & Pre-hire' },
                  { value: 'lifecycle', label: 'Workforce Lifecycle' },
                  { value: 'career', label: 'Promotions & Career' },
                  { value: 'offboarding', label: 'Offboarding & Clearance' },
                ]}
              />
            </FormField>
          )}

          {category === 'letters' && (
            <FormField label="Document Type" required>
              <Select
                value={subType || 'offer_letter'}
                onChange={(e) => setSubType(e.target.value)}
                options={[
                  { value: 'offer_letter', label: 'Offer Letter & Annexure' },
                  { value: 'confirmation_letter', label: 'Probation Confirmation' },
                  { value: 'promotion_letter', label: 'Promotion & Increment' },
                  { value: 'transfer_letter', label: 'Transfer & Deputation' },
                  { value: 'experience_letter', label: 'Relieving & Experience Certificate' },
                ]}
              />
            </FormField>
          )}

          <FormField label="Description / Operational Purpose">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of where and when this template is utilized..."
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
