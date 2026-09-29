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

  useEffect(() => { load(); }, [load]);

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
  if (error) return <Alert variant="error" title="Error" description={error} />;

  const typeVariant = (t: EssNotification['type']): string => {
    if (t === 'success') return 'green';
    if (t === 'warning') return 'yellow';
    if (t === 'action_required') return 'red';
    return 'blue';
  };

  return (
    <Page>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
        actions={
          unreadCount > 0 ? (
            <Button
              id="ess-mark-all-read-btn"
              variant="secondary"
              label="Mark All as Read"
              onClick={handleMarkAllRead}
              loading={markingAll}
            />
          ) : undefined
        }
      />

      <Section title="All Notifications">
        <Toolbar
          left={<span>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>}
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
                <Inline gap="md" alignItems="flex-start" justifyContent="space-between">
                  <Stack gap="xs">
                    <Inline gap="sm" alignItems="center">
                      <BezentIcon name="notifications" size={16} />
                      <span style={{ fontWeight: notif.isRead ? 400 : 700 }}>{notif.title}</span>
                      {!notif.isRead && <Badge variant="blue" label="New" />}
                      <Badge variant={typeVariant(notif.type)} label={notif.type.replace('_', ' ')} />
                    </Inline>
                    <span>{notif.message}</span>
                    <span style={{ fontSize: '0.8em' }}>
                      {new Date(notif.createdAt).toLocaleString('en-IN')}
                    </span>
                  </Stack>
                  {!notif.isRead && (
                    <Button
                      id={`mark-read-${notif.id}`}
                      variant="ghost"
                      size="sm"
                      label="Mark Read"
                      onClick={() => handleMarkRead(notif.id)}
                      loading={markingId === notif.id}
                    />
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
