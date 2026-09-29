import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  EmptyState,
  Toolbar,
  type BadgeVariant,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssNotification } from '../api/essApi';

export function EssNotificationsPage() {
  const [notifications, setNotifications] = useState<EssNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    setMarkingId(id);
    try {
      await essApi.markNotificationRead(id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await essApi.markAllRead();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) return <LoadingState label="Loading notifications..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  const typeVariant = (t: EssNotification['type']): BadgeVariant => {
    if (t === 'success') return 'success';
    if (t === 'warning') return 'warning';
    if (t === 'action_required') return 'danger';
    return 'info';
  };

  return (
    <Page>
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
            : 'All caught up!'
        }
        actions={
          unreadCount > 0 ? (
            <Button
              id="ess-mark-all-read-btn"
              variant="secondary"
              onClick={handleMarkAllRead}
              loading={markingAll}
            >
              Mark All as Read
            </Button>
          ) : undefined
        }
      />

      <Section title="All Notifications">
        <Toolbar
          left={
            <span>
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </span>
          }
        />
        {notifications.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description="Notifications about your attendance, leave, tasks and other updates will appear here."
          />
        ) : (
          <Stack gap="sm">
            {notifications.map((notif) => (
              <Card key={notif.id}>
                <Inline gap="md" align="start" justify="between">
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <BezentIcon name="notifications" size={16} />
                      {notif.isRead ? <span>{notif.title}</span> : <strong>{notif.title}</strong>}
                      {!notif.isRead && <Badge variant="info">New</Badge>}
                      <Badge variant={typeVariant(notif.type)}>
                        {notif.type.replace('_', ' ')}
                      </Badge>
                    </Inline>
                    <span>{notif.message}</span>
                    <small>{new Date(notif.createdAt).toLocaleString('en-IN')}</small>
                  </Stack>
                  {!notif.isRead && (
                    <Button
                      id={`mark-read-${notif.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(notif.id)}
                      loading={markingId === notif.id}
                    >
                      Mark Read
                    </Button>
                  )}
                </Inline>
              </Card>
            ))}
          </Stack>
        )}
      </Section>
    </Page>
  );
}
