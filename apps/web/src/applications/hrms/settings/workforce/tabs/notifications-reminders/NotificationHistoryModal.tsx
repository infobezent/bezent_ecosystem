import React, { useState } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Stack } from '../../../../../../design-system/components/Stack/Stack';
import { Inline } from '../../../../../../design-system/components/Inline/Inline';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  NotificationHistoryItem,
  NotificationHistoryStatus,
} from '../../../types/notificationSettings.types';
import { retryNotification } from '../../../api/notificationSettingsApi';

interface NotificationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: NotificationHistoryItem[];
  total: number;
  onRefresh: () => Promise<void>;
}

function formatRecipient(val: string): string {
  if (!val) return '';
  if (val.includes('@') || val.includes('(')) return val;
  return val
    .split(',')
    .map((part) =>
      part
        .trim()
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    )
    .join(', ');
}

export function NotificationHistoryModal({
  isOpen,
  onClose,
  items: initialItems,
  total,
  onRefresh,
}: NotificationHistoryModalProps) {
  const [items, setItems] = useState<NotificationHistoryItem[]>(() => initialItems || []);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<NotificationHistoryItem | null>(null);

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    if (channelFilter !== 'all' && item.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.recipient.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.eventName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    setError(null);
    try {
      const updated = await retryNotification(id);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (selectedItem?.id === id) {
        setSelectedItem(updated);
      }
      setSuccessMsg('Notification delivery re-attempted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to retry notification delivery');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setSuccessMsg('Audit log refreshed');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh log');
    } finally {
      setRefreshing(false);
    }
  };

  const renderStatusBadge = (status: NotificationHistoryStatus) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return <Badge variant="success">{status.toUpperCase()}</Badge>;
      case 'sent':
        return <Badge variant="info">SENT</Badge>;
      case 'queued':
        return <Badge variant="neutral">QUEUED</Badge>;
      case 'failed':
        return <Badge variant="danger">FAILED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={selectedItem ? () => setSelectedItem(null) : onClose}
      title={
        selectedItem
          ? `Delivery Audit: ${formatRecipient(selectedItem.recipient)}`
          : 'Notification & Delivery Audit History'
      }
      size="2xl"
      className="bezent-history-modal"
      footer={
        <div className="bezent-history-modal-footer">
          {selectedItem ? (
            <>
              <Button variant="secondary" onClick={() => setSelectedItem(null)}>
                &larr; Back to Audit Log
              </Button>
              <div className="bezent-history-footer-actions">
                {selectedItem.status === 'failed' && (
                  <Button
                    variant="primary"
                    onClick={() => handleRetry(selectedItem.id)}
                    loading={retryingId === selectedItem.id}
                  >
                    Retry Delivery
                  </Button>
                )}
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <span className="bezent-history-footer-counter">
                Showing {filteredItems.length} of {total || items.length} dispatch logs
              </span>
              <div className="bezent-history-footer-actions">
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
                <Button variant="secondary" onClick={handleRefreshClick} loading={refreshing}>
                  Refresh Log
                </Button>
              </div>
            </>
          )}
        </div>
      }
    >
      <Stack gap="md" className="bezent-notifrem-history-container">
        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert variant="success" title="Success">
            {successMsg}
          </Alert>
        )}

        {/* DEDICATED CLEAN & NEAT VIEW UI */}
        {selectedItem ? (
          <div className="bezent-history-view-workspace">
            {/* 1. Header Banner & Status */}
            <div className="bezent-history-view-card">
              <div className="bezent-history-view-banner">
                <div className="bezent-history-view-meta-pill">
                  <div className="bezent-history-view-icon-box">
                    <BezentIcon
                      name={selectedItem.channel === 'email' ? 'mail' : 'notifications'}
                      size={18}
                    />
                  </div>
                  <div className="bezent-history-view-titles">
                    <div className="bezent-history-view-title-row">
                      <span className="bezent-history-view-main-title">
                        {selectedItem.eventName}
                      </span>
                      {renderStatusBadge(selectedItem.status)}
                    </div>
                    <span className="bezent-history-view-sub-title">
                      {selectedItem.templateName || 'Direct Notification'} &bull; Channel:{' '}
                      {selectedItem.channel.toUpperCase()}
                    </span>
                  </div>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setSelectedItem(null)}>
                  &larr; Back to Log
                </Button>
              </div>

              {/* 4-Column Metadata Grid */}
              <div className="bezent-history-view-grid">
                <div className="bezent-history-meta-block">
                  <span className="bezent-history-meta-label">Recipient</span>
                  <span className="bezent-history-meta-val" title={selectedItem.recipient}>
                    {formatRecipient(selectedItem.recipient)}
                  </span>
                </div>
                <div className="bezent-history-meta-block">
                  <span className="bezent-history-meta-label">Delivery Channel</span>
                  <div className="bezent-history-meta-val">
                    <Badge variant={selectedItem.channel === 'email' ? 'info' : 'neutral'}>
                      {selectedItem.channel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="bezent-history-meta-block">
                  <span className="bezent-history-meta-label">Dispatched At</span>
                  <span className="bezent-history-meta-val">
                    {selectedItem.sentAt
                      ? new Date(selectedItem.sentAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Pending Dispatch'}
                  </span>
                </div>
                <div className="bezent-history-meta-block">
                  <span className="bezent-history-meta-label">Attempts</span>
                  <span className="bezent-history-meta-val">
                    {selectedItem.retryCount > 0
                      ? `${selectedItem.retryCount + 1} attempts (${selectedItem.retryCount} retried)`
                      : '1st Attempt'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Message Envelope & Body */}
            <div className="bezent-history-view-card">
              <div className="bezent-history-card-header">
                <h4 className="bezent-history-card-title">
                  Message Payload &amp; Delivery Envelope
                </h4>
              </div>
              <div className="bezent-history-envelope">
                <div className="bezent-history-envelope-row">
                  <span className="bezent-history-envelope-label">From:</span>
                  <span className="bezent-history-envelope-val">
                    BEZENT Automated Dispatch &lt;notifications@bezent.internal&gt;
                  </span>
                </div>
                <div className="bezent-history-envelope-row">
                  <span className="bezent-history-envelope-label">To:</span>
                  <span className="bezent-history-envelope-val bezent-history-envelope-val--to">
                    {formatRecipient(selectedItem.recipient)}
                  </span>
                </div>
                <div className="bezent-history-envelope-row">
                  <span className="bezent-history-envelope-label">Subject:</span>
                  <span className="bezent-history-envelope-subject">{selectedItem.subject}</span>
                </div>
              </div>

              <div className="bezent-history-body-container">
                <div className="bezent-history-body-paper">
                  <pre className="bezent-history-body-text">{selectedItem.contentSnippet}</pre>
                </div>
              </div>
            </div>

            {/* 3. Failure Diagnostics (if failed) */}
            {selectedItem.status === 'failed' && (
              <div className="bezent-history-failure-card">
                <div className="bezent-history-failure-header">
                  <div className="bezent-history-failure-icon">
                    <BezentIcon name="warning" size={18} />
                  </div>
                  <div>
                    <h5 className="bezent-history-failure-title">Delivery Failure Diagnostics</h5>
                    <p className="bezent-history-failure-desc">
                      {selectedItem.failureReason ||
                        'SMTP delivery rejected by recipient gateway or mailbox quota exceeded.'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRetry(selectedItem.id)}
                  loading={retryingId === selectedItem.id}
                >
                  Retry Delivery Now
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* AUDIT LOG LIST VIEW */
          <>
            {/* Filter Bar */}
            <div className="bezent-notifrem-filter-bar bezent-history-filter-bar">
              <Input
                aria-label="Search recipient or subject"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by recipient, event, or subject..."
              />
              <Select
                aria-label="Filter by Channel"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Channels' },
                  { value: 'email', label: 'Email' },
                  { value: 'in_app', label: 'In-App' },
                ]}
              />
              <Select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'read', label: 'Read' },
                  { value: 'queued', label: 'Queued' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>

            {/* Clean, Neat History Table */}
            <div className="bezent-notifrem-table-container">
              <table className="bezent-notifrem-table" aria-label="Notification history log table">
                <thead>
                  <tr>
                    <th scope="col" className="bezent-notifrem-th bezent-history-th--recipient">
                      Recipient
                    </th>
                    <th scope="col" className="bezent-notifrem-th bezent-history-th--event">
                      Event &amp; Template
                    </th>
                    <th scope="col" className="bezent-notifrem-th bezent-history-th--channel">
                      Channel
                    </th>
                    <th scope="col" className="bezent-notifrem-th bezent-history-th--date">
                      Sent Date
                    </th>
                    <th scope="col" className="bezent-notifrem-th bezent-history-th--status">
                      Status
                    </th>
                    <th scope="col" className="bezent-notifrem-th bezent-history-th--actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="bezent-notifrem-td bezent-notifrem-td--empty">
                        No notification history records matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="bezent-notifrem-tr">
                        <td className="bezent-notifrem-td">
                          <div className="bezent-notifrem-cell-stack">
                            <span className="bezent-notifrem-event-name">
                              {formatRecipient(item.recipient)}
                            </span>
                            <span
                              className="bezent-notifrem-event-desc bezent-history-subject-truncate"
                              title={item.subject}
                            >
                              {item.subject}
                            </span>
                          </div>
                        </td>
                        <td className="bezent-notifrem-td">
                          <div className="bezent-notifrem-cell-stack">
                            <span className="bezent-notifrem-badge-label">{item.eventName}</span>
                            <span className="bezent-notifrem-event-desc">
                              {item.templateName || 'Direct Notification'}
                            </span>
                          </div>
                        </td>
                        <td className="bezent-notifrem-td bezent-notifrem-td--center">
                          <Badge variant={item.channel === 'email' ? 'info' : 'neutral'}>
                            {item.channel.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="bezent-notifrem-td">
                          <div className="bezent-notifrem-cell-stack">
                            <span className="bezent-notifrem-date">
                              {item.sentAt
                                ? new Date(item.sentAt).toLocaleString([], {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })
                                : new Date(item.createdAt).toLocaleString([], {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  })}
                            </span>
                            {item.retryCount > 0 && (
                              <span className="bezent-notifrem-event-desc">
                                Retried {item.retryCount}x
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="bezent-notifrem-td bezent-notifrem-td--center">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="bezent-notifrem-td bezent-history-td--actions">
                          <div className="bezent-history-actions-group">
                            <button
                              type="button"
                              className="bezent-notifrem-icon-btn bezent-notifrem-icon-btn--sm"
                              title="View delivery details"
                              aria-label={`View details for ${item.recipient}`}
                              onClick={() => setSelectedItem(item)}
                            >
                              <BezentIcon name="view" size={14} />
                            </button>
                            {item.status === 'failed' && (
                              <button
                                type="button"
                                className="bezent-notifrem-icon-btn bezent-notifrem-icon-btn--sm bezent-notifrem-icon-btn--danger"
                                title="Retry delivery"
                                aria-label={`Retry delivery for ${item.recipient}`}
                                onClick={() => handleRetry(item.id)}
                                disabled={retryingId === item.id}
                              >
                                <BezentIcon name="sync" size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Stack>
    </Modal>
  );
}
