import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
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
} from '../../../../design-system/components';
import { LeaveSettingsHeader } from './LeaveSettingsHeader';
import { LeaveStatGrid } from './LeaveStatGrid';
import { restrictionsApi } from './api/leaveAdminApi';
import { fetchLeaveTypes } from './api/leaveTypesApi';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import type { RestrictionRuleItem, RestrictionType } from './types/leaveAdmin.types';

export interface RestrictionsTabProps {
  canManage?: boolean;
  initialRules?: RestrictionRuleItem[];
}

const TYPE_LABELS: Record<RestrictionType, string> = {
  clubbing: 'Clubbing (blocked combination)',
  blackout: 'Blackout period',
  min_notice: 'Minimum notice',
  min_gap: 'Minimum gap between requests',
  frequency_cap: 'Request frequency cap',
  team_concurrency: 'Team concurrency (warning only)',
};

type Option = { id: string; name: string };
type Config = Record<string, unknown>;

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const DEFAULT_CONFIG: Record<RestrictionType, Config> = {
  clubbing: { leaveTypeIdA: '', leaveTypeIdB: '' },
  blackout: {
    startDate: '',
    endDate: '',
    scope: 'company',
    scopeId: null,
    leaveTypeIds: [],
    allowHrOverride: false,
  },
  min_notice: { leaveTypeId: '', days: 3 },
  min_gap: { leaveTypeId: '', workingDays: 5 },
  frequency_cap: { leaveTypeId: '', maxPerMonth: 2, maxPerCycle: null },
  team_concurrency: { departmentId: null, maxPercent: 30, maxCount: null },
};

export function RestrictionsTab({ canManage = true, initialRules }: RestrictionsTabProps = {}) {
  const [rules, setRules] = useState<RestrictionRuleItem[]>(initialRules ?? []);
  const [loading, setLoading] = useState(!initialRules);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<RestrictionRuleItem | 'new' | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRules(await restrictionsApi.list());
    } catch (err) {
      setError(errorText(err, 'Failed to load restriction rules'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialRules) void load();
  }, [initialRules, load]);

  useEffect(() => {
    fetchLeaveTypes({ limit: 100 })
      .then((res) =>
        setLeaveTypes(res.items.map((t) => ({ id: t.id, name: `${t.name} (${t.code})` }))),
      )
      .catch(() => undefined);
    if (!canManage) return;
    fetchOrganizationMasters()
      .then((m) => {
        setDepartments(m.departments);
        setLocations(m.locations);
      })
      .catch(() => undefined);
  }, [canManage]);

  const typeName = (id: unknown) => leaveTypes.find((t) => t.id === id)?.name ?? 'leave type';

  const summarize = (rule: RestrictionRuleItem): string => {
    const c = rule.config;
    switch (rule.ruleType) {
      case 'clubbing':
        return `${typeName(c.leaveTypeIdA)} cannot be adjacent to ${typeName(c.leaveTypeIdB)}`;
      case 'blackout':
        return `${c.startDate} to ${c.endDate}${(c.leaveTypeIds as string[]).length ? ` · ${(c.leaveTypeIds as string[]).length} type(s)` : ' · all types'}`;
      case 'min_notice':
        return `${typeName(c.leaveTypeId)}: ${c.days} day(s) notice`;
      case 'min_gap':
        return `${typeName(c.leaveTypeId)}: ${c.workingDays} working day(s) apart`;
      case 'frequency_cap':
        return `${typeName(c.leaveTypeId)}: ${c.maxPerMonth ?? '–'}/month, ${c.maxPerCycle ?? '–'}/year`;
      case 'team_concurrency':
        return `${c.maxPercent ? `${c.maxPercent}%` : ''}${c.maxPercent && c.maxCount ? ' or ' : ''}${c.maxCount ? `${c.maxCount} people` : ''} on leave`;
    }
  };

  const toggleActive = async (rule: RestrictionRuleItem) => {
    try {
      await restrictionsApi.update(rule.ruleKey, { isActive: !rule.isActive });
      setSuccess(`Rule "${rule.name}" ${rule.isActive ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (err) {
      setError(errorText(err, 'Failed to update rule'));
    }
  };

  return (
    <Stack gap="lg">
      <LeaveSettingsHeader
        icon="security"
        title="Restrictions"
        subtitle="Company rules spanning leave types: combinations, blackout periods, notice, gaps and frequency."
        actions={
          canManage ? (
            <Button variant="primary" type="button" onClick={() => setEditing('new')}>
              Add Rule
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
      {!loading && rules.length > 0 && (
        <LeaveStatGrid
          stats={[
            {
              label: 'Active Rules',
              value: rules.filter((r) => r.isActive).length,
              caption: `${rules.length} Total`,
              icon: 'security',
              tone: 'green',
            },
            {
              label: 'Blackout Periods',
              value: rules.filter((r) => r.isActive && r.ruleType === 'blackout').length,
              caption: 'Leave Frozen',
              icon: 'calendar',
              tone: 'purple',
            },
            {
              label: 'Notice & Gap',
              value: rules.filter(
                (r) => r.isActive && (r.ruleType === 'min_notice' || r.ruleType === 'min_gap'),
              ).length,
              caption: 'Timing Rules',
              icon: 'clock',
              tone: 'blue',
            },
            {
              label: 'Team Limits',
              value: rules.filter((r) => r.isActive && r.ruleType === 'team_concurrency').length,
              caption: 'Warning Only',
              icon: 'groups',
            },
          ]}
        />
      )}
      <Card padding="none">
        {loading ? (
          <Card padding="lg">
            <Inline justify="center" gap="sm">
              <Spinner size="md" />
              <span>Loading rules...</span>
            </Inline>
          </Card>
        ) : rules.length === 0 ? (
          <EmptyState
            title="No Restrictions"
            description="No restriction rules are configured; only leave type limits apply."
            primaryAction={
              canManage ? { label: 'Add Rule', onClick: () => setEditing('new') } : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Rule</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Configuration</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <strong>{rule.name}</strong>
                    <CardDescription>Version {rule.version}</CardDescription>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[rule.ruleType]}</TableCell>
                  <TableCell>{summarize(rule)}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'success' : 'neutral'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <Inline gap="xs">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => setEditing(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => void toggleActive(rule)}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Inline>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      {editing && (
        <RuleModal
          rule={editing === 'new' ? null : editing}
          leaveTypes={leaveTypes}
          departments={departments}
          locations={locations}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setSuccess(`Rule "${saved.name}" saved.`);
            void load();
          }}
        />
      )}
    </Stack>
  );
}

function RuleModal({
  rule,
  leaveTypes,
  departments,
  locations,
  onClose,
  onSaved,
}: {
  rule: RestrictionRuleItem | null;
  leaveTypes: Option[];
  departments: Option[];
  locations: Option[];
  onClose: () => void;
  onSaved: (rule: RestrictionRuleItem) => void;
}) {
  const [ruleType, setRuleType] = useState<RestrictionType>(rule?.ruleType ?? 'min_notice');
  const [name, setName] = useState(rule?.name ?? '');
  const [config, setConfig] = useState<Config>(rule?.config ?? DEFAULT_CONFIG.min_notice);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: string, value: unknown) =>
    setConfig((prev) => ({ ...prev, [key]: value }));
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

  const typeSelect = (key: string, label: string) => (
    <FormField label={label} htmlFor={`rr_${key}`} required>
      <Select
        id={`rr_${key}`}
        value={str(config[key])}
        onChange={(e) => setField(key, e.target.value)}
      >
        <option value="">Select…</option>
        {leaveTypes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
    </FormField>
  );
  const numberField = (key: string, label: string, helper?: string) => (
    <FormField label={label} htmlFor={`rr_${key}`} helperText={helper}>
      <Input
        id={`rr_${key}`}
        type="number"
        min="0"
        value={str(config[key])}
        onChange={(e) => setField(key, num(e.target.value))}
      />
    </FormField>
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const dto = { ruleType, name: name.trim(), config, isActive };
      onSaved(
        rule ? await restrictionsApi.update(rule.ruleKey, dto) : await restrictionsApi.create(dto),
      );
    } catch (err) {
      setError(errorText(err, 'Failed to save rule'));
    } finally {
      setSaving(false);
    }
  };

  const selectedTypes = (config.leaveTypeIds as string[] | undefined) ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={rule ? 'Edit Restriction' : 'Add Restriction'}
      description={
        rule ? 'Saving creates a new version; the previous one is kept in history.' : undefined
      }
      footer={
        <Inline justify="between">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => void save()}
            disabled={saving || name.trim().length < 2}
          >
            {saving ? 'Saving...' : 'Save Rule'}
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
        <Grid columns={2} gap="md">
          <FormField label="Rule Type" htmlFor="rrType">
            <Select
              id="rrType"
              value={ruleType}
              disabled={Boolean(rule)}
              onChange={(e) => {
                const t = e.target.value as RestrictionType;
                setRuleType(t);
                setConfig(DEFAULT_CONFIG[t]);
              }}
            >
              {(Object.keys(TYPE_LABELS) as RestrictionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Rule Name" htmlFor="rrName" required>
            <Input
              id="rrName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Year-end freeze"
            />
          </FormField>
        </Grid>

        {ruleType === 'clubbing' && (
          <Grid columns={2} gap="md">
            {typeSelect('leaveTypeIdA', 'Leave Type')}
            {typeSelect('leaveTypeIdB', 'Cannot Be Adjacent To')}
          </Grid>
        )}
        {(ruleType === 'min_notice' || ruleType === 'min_gap' || ruleType === 'frequency_cap') &&
          typeSelect('leaveTypeId', 'Leave Type')}
        {ruleType === 'min_notice' &&
          numberField(
            'days',
            'Notice Required (days)',
            '0–90 days between applying and the start date.',
          )}
        {ruleType === 'min_gap' &&
          numberField(
            'workingDays',
            'Minimum Gap (working days)',
            '1–60 working days between two requests of this type.',
          )}
        {ruleType === 'frequency_cap' && (
          <Grid columns={2} gap="md">
            {numberField('maxPerMonth', 'Max Requests per Month')}
            {numberField('maxPerCycle', 'Max Requests per Leave Year')}
          </Grid>
        )}
        {ruleType === 'blackout' && (
          <Stack gap="md">
            <Grid columns={2} gap="md">
              <FormField label="From" htmlFor="rrFrom" required>
                <Input
                  id="rrFrom"
                  type="date"
                  value={str(config.startDate)}
                  onChange={(e) => setField('startDate', e.target.value)}
                />
              </FormField>
              <FormField label="To" htmlFor="rrTo" required>
                <Input
                  id="rrTo"
                  type="date"
                  value={str(config.endDate)}
                  onChange={(e) => setField('endDate', e.target.value)}
                />
              </FormField>
              <FormField label="Applies To" htmlFor="rrScope">
                <Select
                  id="rrScope"
                  value={str(config.scope)}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, scope: e.target.value, scopeId: null }))
                  }
                >
                  <option value="company">Whole company</option>
                  <option value="department">A department</option>
                  <option value="location">A location</option>
                </Select>
              </FormField>
              {config.scope !== 'company' && (
                <FormField
                  label={config.scope === 'department' ? 'Department' : 'Location'}
                  htmlFor="rrScopeId"
                  required
                >
                  <Select
                    id="rrScopeId"
                    value={str(config.scopeId)}
                    onChange={(e) => setField('scopeId', e.target.value || null)}
                  >
                    <option value="">Select…</option>
                    {(config.scope === 'department' ? departments : locations).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
            </Grid>
            <Stack gap="xs">
              <strong>Leave Types</strong>
              <CardDescription>Leave none selected to block every leave type.</CardDescription>
              <Grid columns={2} gap="xs">
                {leaveTypes.map((t) => (
                  <Checkbox
                    key={t.id}
                    label={t.name}
                    checked={selectedTypes.includes(t.id)}
                    onChange={() =>
                      setField(
                        'leaveTypeIds',
                        selectedTypes.includes(t.id)
                          ? selectedTypes.filter((x) => x !== t.id)
                          : [...selectedTypes, t.id],
                      )
                    }
                  />
                ))}
              </Grid>
            </Stack>
          </Stack>
        )}
        {ruleType === 'team_concurrency' && (
          <Stack gap="md">
            <FormField label="Department" htmlFor="rrDept">
              <Select
                id="rrDept"
                value={str(config.departmentId)}
                onChange={(e) => setField('departmentId', e.target.value || null)}
              >
                <option value="">Every department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <Grid columns={2} gap="md">
              {numberField('maxPercent', 'Max % of Team on Leave')}
              {numberField('maxCount', 'Max People on Leave')}
            </Grid>
            <CardDescription>
              Exceeding this warns approvers; it does not block the request.
            </CardDescription>
          </Stack>
        )}
        <Inline justify="between" align="center">
          <strong>Active</strong>
          <Switch
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            aria-label="Active"
          />
        </Inline>
      </Stack>
    </Modal>
  );
}

export default RestrictionsTab;
