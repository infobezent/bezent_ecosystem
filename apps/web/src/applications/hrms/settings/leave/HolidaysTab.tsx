import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Checkbox,
  EmptyState,
  FormField,
  Grid,
  Inline,
  Input,
  Modal,
  Select,
  Spinner,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
} from '../../../../design-system/components';
import { LeaveSettingsHeader } from './LeaveSettingsHeader';
import { LeaveStatGrid } from './LeaveStatGrid';
import { holidaysApi } from './api/leaveAdminApi';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import type {
  HolidayCalendarDetail,
  HolidayCalendarItem,
  HolidayImportResult,
  HolidayType,
} from './types/leaveAdmin.types';

export interface HolidaysTabProps {
  canManage?: boolean;
  initialCalendars?: HolidayCalendarItem[];
}

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export function HolidaysTab({ canManage = true, initialCalendars }: HolidaysTabProps = {}) {
  const [year, setYear] = useState(THIS_YEAR);
  const [calendars, setCalendars] = useState<HolidayCalendarItem[]>(initialCalendars ?? []);
  const [loading, setLoading] = useState(!initialCalendars);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<HolidayCalendarDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCalendars(await holidaysApi.list(year));
    } catch (err) {
      setError(errorText(err, 'Failed to load holiday calendars'));
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    if (!initialCalendars) void load();
  }, [initialCalendars, load]);

  useEffect(() => {
    if (!canManage) return;
    fetchOrganizationMasters()
      .then((m) => setLocations(m.locations))
      .catch(() => undefined);
  }, [canManage]);

  const openCalendar = async (id: string) => {
    try {
      setSelected(await holidaysApi.get(id));
    } catch (err) {
      setError(errorText(err, 'Failed to load calendar'));
    }
  };

  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? id;

  return (
    <Stack gap="lg">
      <LeaveSettingsHeader
        icon="calendar"
        title="Holidays"
        subtitle="Holiday calendars by leave year and location. Published calendars drive working-day counting."
        actions={
          canManage ? (
            <Button variant="primary" type="button" onClick={() => setCreateOpen(true)}>
              Create Calendar
            </Button>
          ) : undefined
        }
      />

      {success && (
        <Alert variant="success" title="Success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!loading && (
        <LeaveStatGrid
          stats={[
            {
              label: 'Calendars',
              value: calendars.length,
              caption: `Leave Year ${year}`,
              icon: 'calendar',
            },
            {
              label: 'Published',
              value: calendars.filter((c) => c.status === 'published').length,
              caption: calendars.some((c) => c.status === 'published') ? 'Live' : 'Not Published',
              icon: 'check',
              tone: calendars.some((c) => c.status === 'published') ? 'green' : 'red',
            },
            {
              label: 'Holidays',
              value: calendars.find((c) => c.isDefault)?.holidayCount ?? 0,
              caption: 'Default Calendar',
              icon: 'events',
              tone: 'blue',
            },
            {
              label: 'Optional Quota',
              value: calendars.find((c) => c.isDefault)?.optionalHolidayQuota ?? 0,
              caption: 'Per Employee',
              icon: 'sparkles',
            },
          ]}
        />
      )}

      <Card padding="md">
        <Inline gap="md" align="center">
          <Select
            aria-label="Leave year"
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                Leave year starting {y}
              </option>
            ))}
          </Select>
          <CardDescription>
            Employees use the published calendar mapped to their location, otherwise the default
            calendar.
          </CardDescription>
        </Inline>
      </Card>

      <Card padding="none">
        {loading ? (
          <Card padding="lg">
            <Inline justify="center" gap="sm">
              <Spinner size="md" />
              <span>Loading holiday calendars...</span>
            </Inline>
          </Card>
        ) : calendars.length === 0 ? (
          <EmptyState
            title="No Holiday Calendars"
            description={`No calendar exists for ${year} yet. Leave counted in working days needs a published calendar.`}
            primaryAction={
              canManage
                ? { label: 'Create Calendar', onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Calendar</TableHeaderCell>
                <TableHeaderCell>Leave Year</TableHeaderCell>
                <TableHeaderCell>Applies To</TableHeaderCell>
                <TableHeaderCell>Holidays</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calendars.map((cal) => (
                <TableRow key={cal.id}>
                  <TableCell>
                    <Inline gap="xs" align="center">
                      <strong>{cal.name}</strong>
                      {cal.isDefault && <Badge variant="info">Default</Badge>}
                    </Inline>
                  </TableCell>
                  <TableCell>
                    {cal.cycleStart} to {cal.cycleEnd}
                  </TableCell>
                  <TableCell>
                    {cal.locationIds.length === 0
                      ? cal.isDefault
                        ? 'All unmapped locations'
                        : 'No locations'
                      : cal.locationIds.map(locationName).join(', ')}
                  </TableCell>
                  <TableCell>
                    {cal.holidayCount}
                    {cal.optionalHolidayQuota > 0 && (
                      <CardDescription>{cal.optionalHolidayQuota} optional allowed</CardDescription>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cal.status === 'published' ? 'success' : 'warning'}>
                      {cal.status === 'published' ? `Published · rev ${cal.revision}` : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => void openCalendar(cal.id)}
                    >
                      {canManage ? 'Manage' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {createOpen && (
        <CalendarFormModal
          year={year}
          locations={locations}
          onClose={() => setCreateOpen(false)}
          onSaved={(cal) => {
            setCreateOpen(false);
            setSuccess(`Calendar "${cal.name}" created.`);
            setSelected(cal);
            void load();
          }}
        />
      )}

      {selected && (
        <CalendarDrawer
          calendar={selected}
          calendars={calendars}
          locations={locations}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onChanged={(cal, message) => {
            setSelected(cal);
            if (message) setSuccess(message);
            void load();
          }}
          onDeleted={() => {
            setSelected(null);
            setSuccess('Draft calendar deleted.');
            void load();
          }}
        />
      )}
    </Stack>
  );
}

function CalendarFormModal({
  year,
  locations,
  calendar,
  onClose,
  onSaved,
}: {
  year: number;
  locations: Array<{ id: string; name: string }>;
  calendar?: HolidayCalendarDetail;
  onClose: () => void;
  onSaved: (cal: HolidayCalendarDetail) => void;
}) {
  const [name, setName] = useState(calendar?.name ?? 'Company Holidays');
  const [calYear, setCalYear] = useState(calendar?.year ?? year);
  const [isDefault, setIsDefault] = useState(calendar?.isDefault ?? true);
  const [quota, setQuota] = useState(String(calendar?.optionalHolidayQuota ?? 0));
  const [locationIds, setLocationIds] = useState<string[]>(calendar?.locationIds ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLocation = (id: string) =>
    setLocationIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const dto = {
        name: name.trim(),
        isDefault,
        optionalHolidayQuota: Number(quota),
        locationIds,
      };
      const saved = calendar
        ? await holidaysApi.update(calendar.id, dto)
        : await holidaysApi.create({ ...dto, year: calYear });
      onSaved(saved);
    } catch (err) {
      setError(errorText(err, 'Failed to save calendar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={calendar ? 'Edit Calendar' : 'Create Holiday Calendar'}
      description="A calendar covers one leave year. Map it to locations, or make it the company default."
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Calendar'}
          </Button>
        </Inline>
      }
    >
      <Stack gap="md">
        {error && (
          <Alert variant="error" title="Could not save">
            {error}
          </Alert>
        )}
        <FormField label="Calendar Name" htmlFor="hcName" required>
          <Input id="hcName" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <Grid columns={2} gap="md">
          <FormField label="Leave Year Starting" htmlFor="hcYear" required>
            <Select
              id="hcYear"
              value={String(calYear)}
              disabled={Boolean(calendar)}
              onChange={(e) => setCalYear(Number(e.target.value))}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Optional Holidays Allowed"
            htmlFor="hcQuota"
            helperText="How many optional holidays an employee may take (0–10)."
          >
            <Input
              id="hcQuota"
              type="number"
              min="0"
              max="10"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
            />
          </FormField>
        </Grid>
        <Inline justify="between" align="center">
          <div>
            <strong>Default Calendar</strong>
            <CardDescription>
              Used by employees whose location has no calendar of its own.
            </CardDescription>
          </div>
          <Switch
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            aria-label="Default calendar"
          />
        </Inline>
        <Stack gap="xs">
          <strong>Locations</strong>
          {locations.length === 0 ? (
            <CardDescription>No locations available.</CardDescription>
          ) : (
            <Grid columns={2} gap="xs">
              {locations.map((loc) => (
                <Checkbox
                  key={loc.id}
                  label={loc.name}
                  checked={locationIds.includes(loc.id)}
                  onChange={() => toggleLocation(loc.id)}
                />
              ))}
            </Grid>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
}

function CalendarDrawer({
  calendar,
  calendars,
  locations,
  canManage,
  onClose,
  onChanged,
  onDeleted,
}: {
  calendar: HolidayCalendarDetail;
  calendars: HolidayCalendarItem[];
  locations: Array<{ id: string; name: string }>;
  canManage: boolean;
  onClose: () => void;
  onChanged: (cal: HolidayCalendarDetail, message?: string) => void;
  onDeleted: () => void;
}) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<HolidayType>('mandatory');
  const [csv, setCsv] = useState('');
  const [importResult, setImportResult] = useState<HolidayImportResult | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [otherCalendars, setOtherCalendars] = useState<HolidayCalendarItem[]>([]);

  useEffect(() => {
    // Copy sources: any other calendar, across years.
    holidaysApi
      .list()
      .then((all) => setOtherCalendars(all.filter((c) => c.id !== calendar.id)))
      .catch(() => setOtherCalendars(calendars.filter((c) => c.id !== calendar.id)));
  }, [calendar.id, calendars]);

  const byMonth = useMemo(() => {
    const groups = new Map<string, HolidayCalendarDetail['holidays']>();
    for (const h of calendar.holidays) {
      const key = `${MONTHS[Number(h.date.slice(5, 7)) - 1]} ${h.date.slice(0, 4)}`;
      groups.set(key, [...(groups.get(key) ?? []), h]);
    }
    return [...groups.entries()];
  }, [calendar.holidays]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err, 'Action failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={calendar.name}
      description={`Leave year ${calendar.cycleStart} to ${calendar.cycleEnd}`}
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" type="button" onClick={onClose}>
            Close
          </Button>
          {canManage && (
            <Inline gap="sm">
              {calendar.status === 'draft' && (
                <Button
                  variant="danger"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await holidaysApi.remove(calendar.id);
                      onDeleted();
                    })
                  }
                >
                  Delete Draft
                </Button>
              )}
              <Button variant="secondary" type="button" onClick={() => setEditOpen(true)}>
                Edit Details
              </Button>
              {calendar.status === 'draft' && (
                <Button
                  variant="primary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      onChanged(
                        await holidaysApi.publish(calendar.id),
                        `"${calendar.name}" is now published.`,
                      ),
                    )
                  }
                >
                  Publish
                </Button>
              )}
            </Inline>
          )}
        </Inline>
      }
    >
      <Stack gap="lg">
        {error && (
          <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Card padding="md">
          <Inline gap="sm" align="center">
            <Badge variant={calendar.status === 'published' ? 'success' : 'warning'}>
              {calendar.status === 'published'
                ? `Published · revision ${calendar.revision}`
                : 'Draft'}
            </Badge>
            {calendar.isDefault && <Badge variant="info">Default</Badge>}
            <CardDescription>
              {calendar.locationIds.length > 0
                ? `Locations: ${calendar.locationIds.map((id) => locations.find((l) => l.id === id)?.name ?? id).join(', ')}`
                : 'No locations mapped'}
            </CardDescription>
          </Inline>
          {calendar.status === 'published' && (
            <CardDescription>
              Changes to a published calendar create a new revision; leave already submitted keeps
              its original calculation.
            </CardDescription>
          )}
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <CardTitle>Holidays ({calendar.holidays.length})</CardTitle>
            {calendar.holidays.length === 0 ? (
              <CardDescription>
                No holidays yet. Add them below, import a CSV, or copy another calendar.
              </CardDescription>
            ) : (
              byMonth.map(([month, list]) => (
                <Stack key={month} gap="xs">
                  <CardDescription>{month}</CardDescription>
                  {list.map((h) => (
                    <Inline key={h.id} justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <strong>{h.date}</strong>
                        <span>{h.name}</span>
                        <Badge variant={h.type === 'optional' ? 'info' : 'neutral'}>
                          {h.type === 'optional' ? 'Optional' : 'Mandatory'}
                        </Badge>
                      </Inline>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(async () => onChanged(await holidaysApi.removeHoliday(h.id)))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </Inline>
                  ))}
                </Stack>
              ))
            )}
          </Stack>
        </Card>

        {canManage && (
          <>
            <Card padding="lg">
              <Stack gap="md">
                <CardTitle>Add Holiday</CardTitle>
                <Grid columns={3} gap="md">
                  <FormField label="Date" htmlFor="holDate" required>
                    <Input
                      id="holDate"
                      type="date"
                      min={calendar.cycleStart}
                      max={calendar.cycleEnd}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Name" htmlFor="holName" required>
                    <Input id="holName" value={name} onChange={(e) => setName(e.target.value)} />
                  </FormField>
                  <FormField label="Type" htmlFor="holType">
                    <Select
                      id="holType"
                      value={type}
                      onChange={(e) => setType(e.target.value as HolidayType)}
                    >
                      <option value="mandatory">Mandatory</option>
                      <option value="optional">Optional</option>
                    </Select>
                  </FormField>
                </Grid>
                <Inline justify="end">
                  <Button
                    variant="primary"
                    type="button"
                    disabled={busy || !date || name.trim().length < 2}
                    onClick={() =>
                      void run(async () => {
                        onChanged(
                          await holidaysApi.addHoliday(calendar.id, {
                            date,
                            name: name.trim(),
                            type,
                          }),
                        );
                        setDate('');
                        setName('');
                      })
                    }
                  >
                    Add Holiday
                  </Button>
                </Inline>
              </Stack>
            </Card>

            <Card padding="lg">
              <Stack gap="md">
                <CardTitle>Import CSV</CardTitle>
                <CardDescription>
                  One holiday per line: <code>date,name,type</code> (type is mandatory or optional).
                  If any row is invalid, nothing is imported.
                </CardDescription>
                <Textarea
                  aria-label="Holiday CSV"
                  rows={4}
                  value={csv}
                  placeholder={`${calendar.cycleStart.slice(0, 4)}-01-26,Republic Day,mandatory`}
                  onChange={(e) => setCsv(e.target.value)}
                />
                {importResult && importResult.errors.length > 0 && (
                  <Alert variant="error" title="Nothing imported — fix these rows">
                    <Stack gap="xs">
                      {importResult.errors.map((e) => (
                        <span key={e.row}>
                          Row {e.row}: {e.message}
                        </span>
                      ))}
                    </Stack>
                  </Alert>
                )}
                <Inline justify="end">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={busy || !csv.trim()}
                    onClick={() =>
                      void run(async () => {
                        const result = await holidaysApi.importCsv(calendar.id, csv);
                        setImportResult(result);
                        if (result.errors.length === 0) {
                          setCsv('');
                          onChanged(
                            await holidaysApi.get(calendar.id),
                            `${result.imported} holiday(s) imported.`,
                          );
                        }
                      })
                    }
                  >
                    Import
                  </Button>
                </Inline>
              </Stack>
            </Card>

            <Card padding="lg">
              <Stack gap="md">
                <CardTitle>Copy From Another Calendar</CardTitle>
                <CardDescription>
                  Holidays are shifted to this leave year; dates that already exist or fall outside
                  it are skipped.
                </CardDescription>
                <Inline gap="sm" align="center">
                  <Select
                    aria-label="Source calendar"
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                  >
                    <option value="">Select a calendar…</option>
                    {otherCalendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.year})
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={busy || !sourceId}
                    onClick={() =>
                      void run(async () => {
                        const res = await holidaysApi.copyFrom(calendar.id, sourceId);
                        onChanged(res.calendar, `${res.copied} copied, ${res.skipped} skipped.`);
                      })
                    }
                  >
                    Copy Holidays
                  </Button>
                </Inline>
              </Stack>
            </Card>
          </>
        )}
      </Stack>

      {editOpen && (
        <CalendarFormModal
          year={calendar.year}
          locations={locations}
          calendar={calendar}
          onClose={() => setEditOpen(false)}
          onSaved={(cal) => {
            setEditOpen(false);
            onChanged(cal, 'Calendar updated.');
          }}
        />
      )}
    </Modal>
  );
}

export default HolidaysTab;
