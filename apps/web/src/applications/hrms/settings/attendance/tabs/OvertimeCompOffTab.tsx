import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  Grid,
  Input,
  Select,
  Switch,
  Stack,
  Inline,
  Button,
  Alert,
  LoadingState,
  Badge,
  Divider,
} from '../../../../../design-system/components';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchOvertimePolicies,
  createOvertimePolicy,
  updateOvertimePolicy,
  type OvertimePolicyItem,
} from '../../../attendance/api/attendanceOvertimeApi';
import {
  fetchCompOffPolicies,
  createCompOffPolicy,
  updateCompOffPolicy,
  type CompOffPolicyItem,
} from '../../../attendance/api/attendanceCompOffApi';

export function OvertimeCompOffTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Overtime Policy State
  const [otPolicyId, setOtPolicyId] = useState<string | null>(null);
  const [otEnabled, setOtEnabled] = useState(true);
  const [otPolicyName, setOtPolicyName] = useState('Standard Company Overtime Policy');
  const [otMinMinutes, setOtMinMinutes] = useState(30);
  const [otDailyCapHours, setOtDailyCapHours] = useState('4.00');
  const [otWeeklyCapHours, setOtWeeklyCapHours] = useState('12.00');
  const [otMonthlyCapHours, setOtMonthlyCapHours] = useState('40.00');
  const [otRoundingRule, setOtRoundingRule] = useState<string>('round_down_15');
  const [otPreApproval, setOtPreApproval] = useState(false);
  const [otAllowPayable, setOtAllowPayable] = useState(true);
  const [otAllowCompOff, setOtAllowCompOff] = useState(true);
  const [otSettlementPreference, setOtSettlementPreference] = useState<'payable' | 'comp_off'>(
    'payable',
  );
  const [otSubmissionWindowDays, setOtSubmissionWindowDays] = useState(14);

  // Comp-Off Policy State
  const [coPolicyId, setCoPolicyId] = useState<string | null>(null);
  const [coEnabled, setCoEnabled] = useState(true);
  const [coPolicyName, setCoPolicyName] = useState('Standard Compensatory Off Policy');
  const [coMinMinutes, setCoMinMinutes] = useState(240);
  const [coHalfDayHours, setCoHalfDayHours] = useState('4.00');
  const [coFullDayHours, setCoFullDayHours] = useState('8.00');
  const [coValidityDays, setCoValidityDays] = useState(60);
  const [coMaxMonthlyDays, setCoMaxMonthlyDays] = useState('2.00');
  const [coAllowCarryForward, setCoAllowCarryForward] = useState(false);
  const [coAllowOtConversion, setCoAllowOtConversion] = useState(true);
  const [coWeeklyOff, setCoWeeklyOff] = useState(true);
  const [coHoliday, setCoHoliday] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Load Overtime Policies
      const otList = await fetchOvertimePolicies();
      if (otList && otList.length > 0) {
        const primary = otList[0];
        if (primary) {
          setOtPolicyId(primary.id);
          setOtPolicyName(primary.policyName);
          setOtEnabled(Boolean(primary.isEnabled));
          setOtMinMinutes(primary.minimumQualifyingMinutes || 30);
          setOtDailyCapHours((primary.dailyCapMinutes / 60).toFixed(2));
          setOtWeeklyCapHours((primary.weeklyCapMinutes / 60).toFixed(2));
          setOtMonthlyCapHours((primary.monthlyCapMinutes / 60).toFixed(2));
          setOtRoundingRule(primary.roundingRule || 'round_down_15');
          setOtPreApproval(Boolean(primary.requiresPreApproval));
          setOtAllowPayable(Boolean(primary.allowPayable));
          setOtAllowCompOff(Boolean(primary.allowCompOff));
          setOtSettlementPreference(primary.defaultSettlementPreference || 'payable');
          setOtSubmissionWindowDays(primary.submissionWindowDays || 14);
        }
      }

      // 2. Load Comp-Off Policies
      const coList = await fetchCompOffPolicies();
      if (coList && coList.length > 0) {
        const primaryCo = coList[0];
        if (primaryCo) {
          setCoPolicyId(primaryCo.id);
          setCoPolicyName(primaryCo.policyName);
          setCoEnabled(Boolean(primaryCo.isEnabled));
          setCoMinMinutes(primaryCo.minimumQualifyingMinutes || 240);
          setCoHalfDayHours(((primaryCo.halfDayThresholdMinutes || 240) / 60).toFixed(2));
          setCoFullDayHours(((primaryCo.fullDayThresholdMinutes || 480) / 60).toFixed(2));
          setCoValidityDays(primaryCo.validityDays || 60);
          setCoMaxMonthlyDays(String(primaryCo.maxEarningLimitPerMonthDays || '2.00'));
          setCoAllowCarryForward(Boolean(primaryCo.allowCarryForward));
          if (primaryCo.eligibleWorkdayScenarios) {
            setCoWeeklyOff(Boolean(primaryCo.eligibleWorkdayScenarios.weeklyOff));
            setCoHoliday(Boolean(primaryCo.eligibleWorkdayScenarios.holiday));
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load policy configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Save Overtime Policy
      const otPayload: Partial<OvertimePolicyItem> = {
        policyName: otPolicyName,
        isEnabled: otEnabled,
        minimumQualifyingMinutes: Number(otMinMinutes) || 30,
        dailyCapMinutes: Math.round(parseFloat(otDailyCapHours || '4') * 60),
        weeklyCapMinutes: Math.round(parseFloat(otWeeklyCapHours || '12') * 60),
        monthlyCapMinutes: Math.round(parseFloat(otMonthlyCapHours || '40') * 60),
        roundingRule: otRoundingRule as OvertimePolicyItem['roundingRule'],
        requiresPreApproval: otPreApproval,
        allowPayable: otAllowPayable,
        allowCompOff: otAllowCompOff,
        defaultSettlementPreference: otSettlementPreference,
        submissionWindowDays: Number(otSubmissionWindowDays) || 14,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      };

      if (otPolicyId) {
        await updateOvertimePolicy(otPolicyId, otPayload);
      } else {
        const created = await createOvertimePolicy(otPayload);
        setOtPolicyId(created.id);
      }

      // 2. Save Comp-Off Policy
      const coPayload: Partial<CompOffPolicyItem> = {
        policyName: coPolicyName,
        isEnabled: coEnabled,
        minimumQualifyingMinutes: Number(coMinMinutes) || 240,
        halfDayThresholdMinutes: Math.round(parseFloat(coHalfDayHours || '4') * 60),
        fullDayThresholdMinutes: Math.round(parseFloat(coFullDayHours || '8') * 60),
        validityDays: Number(coValidityDays) || 60,
        maxEarningLimitPerMonthDays: coMaxMonthlyDays,
        allowCarryForward: coAllowCarryForward,
        eligibleWorkdayScenarios: {
          weeklyOff: coWeeklyOff,
          holiday: coHoliday,
          approvedExtraWork: coAllowOtConversion,
        },
        effectiveFrom: new Date().toISOString().slice(0, 10),
      };

      if (coPolicyId) {
        await updateCompOffPolicy(coPolicyId, coPayload);
      } else {
        const createdCo = await createCompOffPolicy(coPayload);
        setCoPolicyId(createdCo.id);
      }

      setSuccess('Overtime and Comp-Off policies have been successfully saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save policies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Overtime & Comp-Off policies..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* ── CARD 1: OVERTIME (OT) POLICY ── */}
      <Card>
        <CardHeader>
          <Inline justify="between" align="center">
            <div>
              <CardTitle>Overtime (OT) Policy Configuration</CardTitle>
              <span className="bezent-text-secondary">
                Control overtime qualifying thresholds, statutory hour caps, rounding, and payout
                modes.
              </span>
            </div>
            <Badge variant={otEnabled ? 'success' : 'neutral'}>
              {otEnabled ? 'OT Enabled' : 'OT Disabled'}
            </Badge>
          </Inline>
        </CardHeader>

        <Stack gap="md">
          <SettingsRow
            label="Enable Overtime Tracking"
            description="When enabled, employee attendance beyond scheduled shift hours calculates as overtime."
          >
            <Switch
              checked={otEnabled}
              onChange={(e) => setOtEnabled(e.target.checked)}
              label={otEnabled ? 'Enabled' : 'Disabled'}
            />
          </SettingsRow>

          <Divider />

          <SettingsRow
            label="Policy Display Name"
            description="Human-readable title displayed on claim submission screens and payslips."
          >
            <Input
              value={otPolicyName}
              onChange={(e) => setOtPolicyName(e.target.value)}
              placeholder="e.g. Standard Corporate Overtime Policy"
            />
          </SettingsRow>

          <SettingsRow
            label="Minimum Qualifying Extra Minutes"
            description="Extra minutes an employee must work after shift end before OT calculation begins."
            tooltip="Example: 30 minutes threshold means working 25 extra minutes counts as 0 OT, but 35 minutes qualifies."
          >
            <Select
              value={String(otMinMinutes)}
              onChange={(e) => setOtMinMinutes(Number(e.target.value))}
              options={[
                { value: '15', label: '15 Minutes' },
                { value: '30', label: '30 Minutes (Recommended)' },
                { value: '45', label: '45 Minutes' },
                { value: '60', label: '60 Minutes (1 Hour)' },
                { value: '120', label: '120 Minutes (2 Hours)' },
              ]}
            />
          </SettingsRow>

          <SettingsRow
            label="Rounding Rule"
            description="Mathematical rounding applied to extra worked duration."
          >
            <Select
              value={otRoundingRule}
              onChange={(e) => setOtRoundingRule(e.target.value)}
              options={[
                { value: 'exact', label: 'Exact (No Rounding)' },
                { value: 'round_down_15', label: 'Round Down to 15 Mins' },
                { value: 'round_nearest_15', label: 'Round Nearest 15 Mins' },
                { value: 'round_down_30', label: 'Round Down to 30 Mins' },
                { value: 'round_nearest_30', label: 'Round Nearest 30 Mins' },
              ]}
            />
          </SettingsRow>

          <Grid columns={3} gap="md">
            <div>
              <span className="bezent-label">Daily Max Cap (Hours)</span>
              <Input
                type="number"
                value={otDailyCapHours}
                onChange={(e) => setOtDailyCapHours(e.target.value)}
                placeholder="4.00"
              />
            </div>
            <div>
              <span className="bezent-label">Weekly Max Cap (Hours)</span>
              <Input
                type="number"
                value={otWeeklyCapHours}
                onChange={(e) => setOtWeeklyCapHours(e.target.value)}
                placeholder="12.00"
              />
            </div>
            <div>
              <span className="bezent-label">Monthly Max Cap (Hours)</span>
              <Input
                type="number"
                value={otMonthlyCapHours}
                onChange={(e) => setOtMonthlyCapHours(e.target.value)}
                placeholder="40.00"
              />
            </div>
          </Grid>

          <Divider />

          <SettingsRow
            label="Require Pre-Approval"
            description="If enabled, employee must submit an advance overtime plan before working extra hours."
          >
            <Switch
              checked={otPreApproval}
              onChange={(e) => setOtPreApproval(e.target.checked)}
              label={otPreApproval ? 'Yes, Required' : 'No (Post-Punch Claim Allowed)'}
            />
          </SettingsRow>

          <SettingsRow
            label="Claim Submission Window (Days)"
            description="Number of calendar days after work date an employee can submit an OT claim."
          >
            <Select
              value={String(otSubmissionWindowDays)}
              onChange={(e) => setOtSubmissionWindowDays(Number(e.target.value))}
              options={[
                { value: '7', label: '7 Days' },
                { value: '14', label: '14 Days (Default)' },
                { value: '30', label: '30 Days' },
                { value: '60', label: '60 Days' },
              ]}
            />
          </SettingsRow>

          <SettingsRow
            label="Default Settlement Mode"
            description="Whether approved OT defaults to financial payout or Comp-Off credit."
          >
            <Select
              value={otSettlementPreference}
              onChange={(e) => setOtSettlementPreference(e.target.value as 'payable' | 'comp_off')}
              options={[
                { value: 'payable', label: 'Payable Overtime (Disbursed in Payroll)' },
                { value: 'comp_off', label: 'Convert to Comp-Off Credit (Leave Balance)' },
              ]}
            />
          </SettingsRow>
        </Stack>
      </Card>

      {/* ── CARD 2: COMPENSATORY OFF (COMP-OFF) POLICY ── */}
      <Card>
        <CardHeader>
          <Inline justify="between" align="center">
            <div>
              <CardTitle>Compensatory Off (Comp-Off) Policy Configuration</CardTitle>
              <span className="bezent-text-secondary">
                Configure credit generation rules, validity expiration, and holiday work thresholds.
              </span>
            </div>
            <Badge variant={coEnabled ? 'success' : 'neutral'}>
              {coEnabled ? 'Comp-Off Enabled' : 'Comp-Off Disabled'}
            </Badge>
          </Inline>
        </CardHeader>

        <Stack gap="md">
          <SettingsRow
            label="Enable Compensatory Off"
            description="Permits employees working on weekly offs or declared holidays to earn leave credits."
          >
            <Switch
              checked={coEnabled}
              onChange={(e) => setCoEnabled(e.target.checked)}
              label={coEnabled ? 'Enabled' : 'Disabled'}
            />
          </SettingsRow>

          <Divider />

          <SettingsRow
            label="Policy Display Name"
            description="Title displayed on ESS Comp-Off requests and leave ledgers."
          >
            <Input
              value={coPolicyName}
              onChange={(e) => setCoPolicyName(e.target.value)}
              placeholder="e.g. Standard Compensatory Off Policy"
            />
          </SettingsRow>

          <Grid columns={2} gap="md">
            <div>
              <span className="bezent-label">Half-Day Credit Threshold (Hours)</span>
              <Input
                type="number"
                value={coHalfDayHours}
                onChange={(e) => setCoHalfDayHours(e.target.value)}
                placeholder="4.00"
              />
              <span className="bezent-text-hint">Minimum work hours to earn 0.5 Comp-Off day</span>
            </div>
            <div>
              <span className="bezent-label">Full-Day Credit Threshold (Hours)</span>
              <Input
                type="number"
                value={coFullDayHours}
                onChange={(e) => setCoFullDayHours(e.target.value)}
                placeholder="8.00"
              />
              <span className="bezent-text-hint">Minimum work hours to earn 1.0 Comp-Off day</span>
            </div>
          </Grid>

          <SettingsRow
            label="Comp-Off Validity (Expiration Days)"
            description="Number of days from earning date before unutilized comp-off credit expires."
            tooltip="Enterprise best practice is 60 or 90 days. Expired credits will auto-lapse."
          >
            <Select
              value={String(coValidityDays)}
              onChange={(e) => setCoValidityDays(Number(e.target.value))}
              options={[
                { value: '30', label: '30 Days (1 Month)' },
                { value: '60', label: '60 Days (2 Months - Recommended)' },
                { value: '90', label: '90 Days (Quarterly)' },
                { value: '180', label: '180 Days (Half Year)' },
                { value: '365', label: '365 Days (1 Year)' },
              ]}
            />
          </SettingsRow>

          <SettingsRow
            label="Max Earning Limit Per Month (Days)"
            description="Maximum number of comp-off days an employee can accrue in a single calendar month."
          >
            <Input
              type="number"
              value={coMaxMonthlyDays}
              onChange={(e) => setCoMaxMonthlyDays(e.target.value)}
              placeholder="2.00"
            />
          </SettingsRow>

          <SettingsRow
            label="Eligible Workday Scenarios"
            description="Select which non-working days qualify for Comp-Off earning."
          >
            <Stack gap="xs">
              <Inline gap="md">
                <Switch
                  checked={coWeeklyOff}
                  onChange={(e) => setCoWeeklyOff(e.target.checked)}
                  label="Work on Weekly Off (Weekend)"
                />
                <Switch
                  checked={coHoliday}
                  onChange={(e) => setCoHoliday(e.target.checked)}
                  label="Work on Public Holidays"
                />
              </Inline>
            </Stack>
          </SettingsRow>

          <Divider />

          <SettingsRow
            label="Allow Overtime Conversion"
            description="Allows approved overtime settlements to be converted into Comp-Off leave credits instead of cash payout."
          >
            <Switch
              checked={coAllowOtConversion}
              onChange={(e) => setCoAllowOtConversion(e.target.checked)}
              label={coAllowOtConversion ? 'Enabled' : 'Disabled'}
            />
          </SettingsRow>

          <SettingsRow
            label="Double Benefit Prevention"
            description="Guarantees that work hours claimed for Overtime payment cannot also generate Comp-Off."
          >
            <Badge variant="info">Enforced by System Rules</Badge>
          </SettingsRow>
        </Stack>
      </Card>

      <Inline justify="end" gap="sm">
        <Button variant="secondary" onClick={loadSettings} disabled={saving}>
          Reset Changes
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving Policies...' : 'Save Overtime & Comp-Off Settings'}
        </Button>
      </Inline>
    </Stack>
  );
}

export default OvertimeCompOffTab;
