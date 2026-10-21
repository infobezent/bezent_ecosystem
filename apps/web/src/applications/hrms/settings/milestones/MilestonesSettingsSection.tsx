import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Inline,
  Input,
  Modal,
  Section,
  Select,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Tabs,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  milestonesApi,
  type MilestoneConfigDto,
  type RewardsCatalogueItemDto,
  type EmployeeRewardAssignmentDto,
} from '../../milestones/api/milestonesApi';

export function MilestonesSettingsSection() {
  const [activeTab, setActiveTab] = useState<'configs' | 'catalogue' | 'assignments'>('configs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [configs, setConfigs] = useState<MilestoneConfigDto[]>([]);
  const [catalogue, setCatalogue] = useState<RewardsCatalogueItemDto[]>([]);
  const [assignments, setAssignments] = useState<EmployeeRewardAssignmentDto[]>([]);

  // Config editing modal
  const [editingConfig, setEditingConfig] = useState<MilestoneConfigDto | null>(null);
  const [configTitle, setConfigTitle] = useState('');
  const [configHours, setConfigHours] = useState('100000');
  const [configBadgeLabel, setConfigBadgeLabel] = useState('');
  const [configSaving, setConfigSaving] = useState(false);

  // New catalogue item modal
  const [showAddReward, setShowAddReward] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardCategory, setRewardCategory] = useState('gift');
  const [rewardSaving, setRewardSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [cfgs, cat, assign] = await Promise.all([
        milestonesApi.getMilestoneConfigs(),
        milestonesApi.getRewardsCatalogue(),
        milestonesApi.getRewardAssignments(),
      ]);
      setConfigs(cfgs);
      setCatalogue(cat);
      setAssignments(assign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEditConfig = (cfg: MilestoneConfigDto) => {
    setEditingConfig(cfg);
    setConfigTitle(cfg.title);
    setConfigHours(String(cfg.requiredHours));
    setConfigBadgeLabel(cfg.badgeLabel);
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    try {
      setConfigSaving(true);
      setError(null);
      await milestonesApi.updateMilestoneConfig({
        id: editingConfig.id,
        milestoneKey: editingConfig.milestoneKey,
        title: configTitle.trim() || editingConfig.title,
        requiredHours: parseInt(configHours, 10) || 100000,
        badgeLabel: configBadgeLabel.trim() || editingConfig.badgeLabel,
        isActive: editingConfig.isActive,
      });
      setSuccess('Milestone configuration updated successfully.');
      setEditingConfig(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save milestone configuration');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleAddReward = async () => {
    if (!rewardName.trim()) return;
    try {
      setRewardSaving(true);
      setError(null);
      await milestonesApi.addRewardCatalogueItem({
        milestoneKey: '100k_hours',
        name: rewardName.trim(),
        description: rewardDesc.trim() || null,
        category: rewardCategory,
        isActive: true,
      });
      setSuccess('New reward added to catalogue.');
      setShowAddReward(false);
      setRewardName('');
      setRewardDesc('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reward');
    } finally {
      setRewardSaving(false);
    }
  };

  const handleUpdateRewardStatus = async (
    assignmentId: string,
    newStatus: string,
    notes?: string,
  ) => {
    try {
      setError(null);
      await milestonesApi.updateRewardStatus(assignmentId, newStatus, notes);
      setSuccess(`Reward assignment status updated to ${newStatus}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reward status');
    }
  };

  return (
    <Stack gap="xl">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success">
          {success}
        </Alert>
      )}

      {loading && (
        <Card variant="flat">
          <span className="bezent-text-muted">Loading milestone settings...</span>
        </Card>
      )}

      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as 'configs' | 'catalogue' | 'assignments')}
        items={[
          { id: 'configs', label: 'Milestone Thresholds & Rules' },
          { id: 'catalogue', label: 'Recognition Rewards Catalogue' },
          { id: 'assignments', label: 'Reward Approvals & Fulfilment' },
        ]}
      />

      {/* ── Tab 1: Milestone Definitions ──────────────────────────────── */}
      {activeTab === 'configs' && (
        <Section
          title="Configurable Lifetime Working-Hour Milestones"
          subtitle="Configure thresholds, recognition badges, and poster templates. Default: 100,000 Verified Hours."
        >
          <Grid columns={2} gap="lg">
            {configs.map((cfg) => (
              <Card key={cfg.id} variant="default">
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <Inline gap="sm" align="center">
                      <BezentIcon name="award" size={24} />
                      <Stack gap="xs">
                        <strong>{cfg.title}</strong>
                        <span className="bezent-text-muted">Key: {cfg.milestoneKey}</span>
                      </Stack>
                    </Inline>
                    <Badge variant={cfg.isActive ? 'success' : 'neutral'} size="sm">
                      {cfg.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Inline>

                  <Divider />

                  <Grid columns={2} gap="sm">
                    <Stack gap="xs">
                      <span className="bezent-text-muted">Threshold Required</span>
                      <strong>{cfg.requiredHours.toLocaleString()} verified hours</strong>
                    </Stack>
                    <Stack gap="xs">
                      <span className="bezent-text-muted">Badge Label</span>
                      <strong>{cfg.badgeLabel}</strong>
                    </Stack>
                  </Grid>

                  <span>{cfg.description}</span>

                  <Inline justify="end" align="center">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<BezentIcon name="edit" size={14} />}
                      onClick={() => handleOpenEditConfig(cfg)}
                    >
                      Edit Threshold
                    </Button>
                  </Inline>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      {/* ── Tab 2: Reward Catalogue ───────────────────────────────────── */}
      {activeTab === 'catalogue' && (
        <Section
          title="Employee Recognition Reward Catalogue"
          subtitle="Admin-configurable gift catalogue and recognition rewards assigned upon milestone achievement."
          actions={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<BezentIcon name="plus" size={14} />}
              onClick={() => setShowAddReward(true)}
            >
              Add Reward Item
            </Button>
          }
        >
          <Grid columns={3} gap="md">
            {catalogue.map((item) => (
              <Card key={item.id} variant="default">
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <Inline gap="xs" align="center">
                      <BezentIcon name="gift" size={20} />
                      <strong>{item.name}</strong>
                    </Inline>
                    <Badge variant="info" size="sm">
                      {item.category.toUpperCase()}
                    </Badge>
                  </Inline>

                  <p className="bezent-text-muted">{item.description}</p>

                  <Badge variant={item.isActive ? 'success' : 'neutral'} size="sm">
                    {item.isActive ? 'Eligible for Assignment' : 'Retired'}
                  </Badge>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      {/* ── Tab 3: Reward Approvals & Fulfilment ───────────────────────── */}
      {activeTab === 'assignments' && (
        <Section
          title="Assigned Milestone Rewards & Fulfilment Workflow"
          subtitle="Audit approval, assignment, dispatch, and delivery of commemorative milestone rewards."
        >
          {assignments.length === 0 ? (
            <Card variant="flat">
              <span className="bezent-text-muted">
                No active reward assignments found across the organization.
              </span>
            </Card>
          ) : (
            <Card variant="default">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Reward</TableHeaderCell>
                    <TableHeaderCell>Fulfilment Status</TableHeaderCell>
                    <TableHeaderCell>Awarded Date</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <strong>{a.rewardName}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            a.status === 'fulfilled'
                              ? 'success'
                              : a.status === 'approved'
                                ? 'info'
                                : 'warning'
                          }
                          size="sm"
                        >
                          {a.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{a.createdAt?.slice(0, 10) || 'Recent'}</TableCell>
                      <TableCell>
                        <Inline gap="xs" align="center">
                          {a.status === 'eligible' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdateRewardStatus(a.id, 'approved', 'Approved by HR')}
                            >
                              Approve
                            </Button>
                          )}
                          {a.status === 'approved' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                handleUpdateRewardStatus(a.id, 'fulfilled', 'Delivered & presented')
                              }
                            >
                              Mark Fulfilled
                            </Button>
                          )}
                        </Inline>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Section>
      )}

      {/* Edit Milestone Threshold Modal */}
      {editingConfig && (
        <Modal
          isOpen={true}
          title={`Edit Milestone: ${editingConfig.milestoneKey}`}
          onClose={() => setEditingConfig(null)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setEditingConfig(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={configSaving}
                onClick={handleSaveConfig}
              >
                {configSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <Input
              label="Milestone Display Title"
              value={configTitle}
              onChange={(e) => setConfigTitle(e.target.value)}
            />
            <Input
              label="Required Verified Lifetime Hours"
              type="number"
              value={configHours}
              onChange={(e) => setConfigHours(e.target.value)}
            />
            <Input
              label="Badge Label"
              value={configBadgeLabel}
              onChange={(e) => setConfigBadgeLabel(e.target.value)}
            />
          </Stack>
        </Modal>
      )}

      {/* Add Reward Modal */}
      {showAddReward && (
        <Modal
          isOpen={true}
          title="Add New Reward to Catalogue"
          onClose={() => setShowAddReward(false)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setShowAddReward(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={rewardSaving || !rewardName.trim()}
                onClick={handleAddReward}
              >
                {rewardSaving ? 'Saving...' : 'Add Reward'}
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <Input
              label="Reward Name"
              placeholder="e.g. Executive Centurion Timepiece"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
            />
            <Select
              label="Category"
              value={rewardCategory}
              onChange={(e) => setRewardCategory(e.target.value)}
              options={[
                { value: 'gift', label: 'Physical Gift / Token' },
                { value: 'experience', label: 'Experience / Sabbatical' },
                { value: 'monetary', label: 'Bonus / Financial' },
              ]}
            />
            <Textarea
              label="Description"
              placeholder="Provide commemorative details..."
              value={rewardDesc}
              onChange={(e) => setRewardDesc(e.target.value)}
            />
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
