import React, { useState, useMemo } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type { RequiredInfoItem, RequiredInfoGroup } from '../../../types/employeeConversion.types';

interface RequiredInformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: RequiredInfoItem[];
  onSave: (items: RequiredInfoItem[]) => Promise<void>;
}

export function RequiredInformationModal({
  isOpen,
  onClose,
  initialItems,
  onSave,
}: RequiredInformationModalProps) {
  const [items, setItems] = useState<RequiredInfoItem[]>(
    () => (initialItems ? [...initialItems] : []),
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleRequired = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (item.isSystemMandatory) return item; // System mandatory locked
          return { ...item, isRequired: !item.isRequired };
        }
        return item;
      }),
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await onSave(items);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save required information settings');
    } finally {
      setSaving(false);
    }
  };

  const mandatoryCount = useMemo(() => items.filter((i) => i.isRequired).length, [items]);
  const optionalCount = items.length - mandatoryCount;

  const renderGroup = (
    groupKey: RequiredInfoGroup,
    title: string,
    iconName: 'employees' | 'workforce' | 'documents',
    iconColorClass: string,
  ) => {
    const rawGroupItems = items.filter((i) => i.group === groupKey);
    const groupMandatory = rawGroupItems.filter((i) => i.isRequired).length;

    const term = searchTerm.trim().toLowerCase();
    const groupItems = term
      ? rawGroupItems.filter(
          (i) =>
            i.fieldName.toLowerCase().includes(term) ||
            i.fieldKey.toLowerCase().includes(term),
        )
      : rawGroupItems;

    if (term && groupItems.length === 0) return null;

    return (
      <div key={groupKey} className="bezent-reqinfo-group-block">
        <div className="bezent-reqinfo-group-header">
          <div className="bezent-reqinfo-group-header-left">
            <div className={`bezent-reqinfo-group-icon ${iconColorClass}`}>
              <BezentIcon name={iconName} size={16} />
            </div>
            <h4 className="bezent-reqinfo-group-title">{title}</h4>
          </div>
          <span className="bezent-reqinfo-group-stat">
            {groupMandatory} Mandatory • {rawGroupItems.length - groupMandatory} Optional
          </span>
        </div>

        <div className="bezent-reqinfo-items-grid">
          {groupItems.map((item) => (
            <div
              key={item.id}
              className={`bezent-reqinfo-item-card ${
                item.isSystemMandatory ? 'bezent-reqinfo-item-card--locked' : ''
              }`}
            >
              <div className="bezent-reqinfo-item-meta">
                <div className="bezent-reqinfo-item-name-row">
                  <span className="bezent-reqinfo-item-name">{item.fieldName}</span>
                  {item.isSystemMandatory && (
                    <Badge variant="neutral" size="sm">
                      System Mandatory
                    </Badge>
                  )}
                  {item.isRequired ? (
                    <Badge variant="warning" size="sm">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Optional
                    </Badge>
                  )}
                </div>
                <span className="bezent-reqinfo-item-key">Property: {item.fieldKey}</span>
              </div>

              <div className="bezent-reqinfo-item-toggle">
                <Switch
                  label={item.isRequired ? 'Mandatory' : 'Optional'}
                  checked={item.isRequired}
                  disabled={item.isSystemMandatory}
                  onChange={() => handleToggleRequired(item.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Required Information"
      size="lg"
      className="bezent-reqinfo-modal"
      footer={
        <div className="bezent-reqinfo-modal-footer">
          <div className="bezent-reqinfo-footer-summary">
            <span className="bezent-reqinfo-footer-dot" />
            <span>
              {mandatoryCount} of {items.length} fields are mandatory before conversion
            </span>
          </div>

          <div className="bezent-reqinfo-footer-actions">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="required-info-form"
              loading={saving}
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : 'Save Required Information'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="required-info-form" onSubmit={handleSubmit} className="bezent-reqinfo-form">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Top Control Bar & Stats */}
        <div className="bezent-reqinfo-toolbar">
          <div className="bezent-reqinfo-toolbar-stats">
            <span className="bezent-reqinfo-pill bezent-reqinfo-pill--mandatory">
              {mandatoryCount} Mandatory
            </span>
            <span className="bezent-reqinfo-pill bezent-reqinfo-pill--optional">
              {optionalCount} Optional
            </span>
          </div>

          <div className="bezent-reqinfo-search-wrap">
            <Input
              id="reqinfo-search-input"
              placeholder="Filter fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
            />
          </div>
        </div>

        {/* Groups */}
        {renderGroup(
          'personal',
          '1. Personal Information',
          'employees',
          'bezent-reqinfo-group-icon--blue',
        )}

        {renderGroup(
          'employment',
          '2. Employment Information',
          'workforce',
          'bezent-reqinfo-group-icon--teal',
        )}

        {renderGroup(
          'additional',
          '3. Additional Information',
          'documents',
          'bezent-reqinfo-group-icon--purple',
        )}
      </form>
    </Modal>
  );
}
