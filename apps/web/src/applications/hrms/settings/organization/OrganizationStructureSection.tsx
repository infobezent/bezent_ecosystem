import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
  FormField,
  FormGrid,
  Grid,
  Inline,
  Input,
  Label,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useAuthorization } from '../../../../platform/auth';
import {
  fetchOrganizationHierarchy,
  fetchEligibleHeads,
  createBusinessUnit,
  updateBusinessUnit,
  setBusinessUnitStatus,
  createDivision,
  updateDivision,
  setDivisionStatus,
} from '../../organization/api/structureApi';
import type {
  OrganizationHierarchy,
  CompanySummary,
  EligibleHead,
  BusinessUnitRecord,
  DivisionRecord,
  SelectedNode,
  CreateBusinessUnitPayload,
  CreateDivisionPayload,
} from '../../organization/types/structure';

export interface OrganizationStructureSectionProps {
  onBack?: () => void;
  onNavigateToProfile?: () => void;
  initialHierarchy?: OrganizationHierarchy;
}

export function OrganizationStructureSection({
  onBack,
  onNavigateToProfile,
  initialHierarchy,
}: OrganizationStructureSectionProps) {
  const { canAny } = useAuthorization();

  const canManage = canAny([
    'organization.structure.manage',
    'hrms.organization.manage',
    'hrms.settings.manage',
  ]);

  // State
  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(
    initialHierarchy ?? null,
  );
  const [heads, setHeads] = useState<EligibleHead[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialHierarchy);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected node in the explorer (defaults to Company root)
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(() => {
    if (initialHierarchy) {
      return {
        type: 'company',
        id: initialHierarchy.company.id,
        data: initialHierarchy.company,
      };
    }
    return null;
  });

  // Expanded business units state (defaults to expanded for all initial BUs)
  const [expandedBuIds, setExpandedBuIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (initialHierarchy) {
      for (const bu of initialHierarchy.businessUnits) {
        init[bu.id] = true;
      }
    }
    return init;
  });

  // Contextual menu open node
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);

  // Modals / Drawers state
  const [isBuModalOpen, setIsBuModalOpen] = useState(false);
  const [editingBu, setEditingBu] = useState<BusinessUnitRecord | null>(null);

  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<DivisionRecord | null>(null);
  const [presetBuIdForDivision, setPresetBuIdForDivision] = useState<string | null>(null);

  // Deactivation confirmation modal
  const [deactivatingItem, setDeactivatingItem] = useState<{
    type: 'bu' | 'division';
    id: string;
    name: string;
  } | null>(null);

  // Form states: BU
  const [buName, setBuName] = useState('');
  const [buCode, setBuCode] = useState('');
  const [buHeadId, setBuHeadId] = useState('');
  const [buDescription, setBuDescription] = useState('');
  const [buStatus, setBuStatus] = useState<'active' | 'inactive'>('active');
  const [buFormError, setBuFormError] = useState<string | null>(null);

  // Form states: Division
  const [divParentBuId, setDivParentBuId] = useState('');
  const [divName, setDivName] = useState('');
  const [divCode, setDivCode] = useState('');
  const [divHeadId, setDivHeadId] = useState('');
  const [divDescription, setDivDescription] = useState('');
  const [divStatus, setDivStatus] = useState<'active' | 'inactive'>('active');
  const [divFormError, setDivFormError] = useState<string | null>(null);

  // Load data
  const loadStructureData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [hierarchyRes, headsRes] = await Promise.all([
        fetchOrganizationHierarchy(),
        fetchEligibleHeads().catch(() => []),
      ]);
      setHierarchy(hierarchyRes);
      setHeads(headsRes);

      // Default expand all business units
      const initialExpanded: Record<string, boolean> = {};
      for (const bu of hierarchyRes.businessUnits) {
        initialExpanded[bu.id] = true;
      }
      setExpandedBuIds(initialExpanded);

      // Default select company node if nothing selected
      setSelectedNode((prev) => {
        if (!prev) {
          return {
            type: 'company',
            id: hierarchyRes.company.id,
            data: hierarchyRes.company,
          };
        }
        // Update selected node with fresh data
        if (prev.type === 'company') {
          return {
            type: 'company',
            id: hierarchyRes.company.id,
            data: hierarchyRes.company,
          };
        }
        if (prev.type === 'business_unit') {
          const freshBu = hierarchyRes.businessUnits.find((b) => b.id === prev.id);
          return freshBu
            ? { type: 'business_unit', id: freshBu.id, data: freshBu }
            : { type: 'company', id: hierarchyRes.company.id, data: hierarchyRes.company };
        }
        if (prev.type === 'division') {
          for (const bu of hierarchyRes.businessUnits) {
            const freshDiv = (bu.divisions ?? []).find((d) => d.id === prev.id);
            if (freshDiv) {
              return { type: 'division', id: freshDiv.id, data: freshDiv };
            }
          }
          return { type: 'company', id: hierarchyRes.company.id, data: hierarchyRes.company };
        }
        return prev;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load organization structure');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStructureData();
  }, [loadStructureData]);

  // Toggle BU expansion
  const toggleBuExpand = (buId: string) => {
    setExpandedBuIds((prev) => ({
      ...prev,
      [buId]: !prev[buId],
    }));
  };

  // Close contextual dropdown when clicking elsewhere
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuKey(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // Open BU Modal for Add
  const handleOpenAddBu = () => {
    setEditingBu(null);
    setBuName('');
    setBuCode('');
    setBuHeadId('');
    setBuDescription('');
    setBuStatus('active');
    setBuFormError(null);
    setIsBuModalOpen(true);
  };

  // Open BU Modal for Edit
  const handleOpenEditBu = (bu: BusinessUnitRecord) => {
    setEditingBu(bu);
    setBuName(bu.name);
    setBuCode(bu.code ?? '');
    setBuHeadId(bu.headEmployeeId ?? '');
    setBuDescription(bu.description ?? '');
    setBuStatus(bu.status);
    setBuFormError(null);
    setIsBuModalOpen(true);
  };

  // Open Division Modal for Add
  const handleOpenAddDivision = (parentBuId?: string) => {
    const defaultParentId =
      parentBuId ??
      (selectedNode?.type === 'business_unit' ? selectedNode.id : '') ??
      (hierarchy?.businessUnits[0]?.id ?? '');

    setEditingDivision(null);
    setPresetBuIdForDivision(defaultParentId);
    setDivParentBuId(defaultParentId);
    setDivName('');
    setDivCode('');
    setDivHeadId('');
    setDivDescription('');
    setDivStatus('active');
    setDivFormError(null);
    setIsDivisionModalOpen(true);
  };

  // Open Division Modal for Edit
  const handleOpenEditDivision = (div: DivisionRecord) => {
    setEditingDivision(div);
    setPresetBuIdForDivision(div.businessUnitId);
    setDivParentBuId(div.businessUnitId);
    setDivName(div.name);
    setDivCode(div.code ?? '');
    setDivHeadId(div.headEmployeeId ?? '');
    setDivDescription(div.description ?? '');
    setDivStatus(div.status);
    setDivFormError(null);
    setIsDivisionModalOpen(true);
  };

  // Submit Business Unit (Create or Update)
  const handleSubmitBu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buName.trim()) {
      setBuFormError('Business unit name is required');
      return;
    }

    try {
      setActionLoading(true);
      setBuFormError(null);
      const payload: CreateBusinessUnitPayload = {
        name: buName.trim(),
        code: buCode.trim() || null,
        headEmployeeId: buHeadId || null,
        description: buDescription.trim() || null,
        status: buStatus,
      };

      if (editingBu) {
        await updateBusinessUnit(editingBu.id, payload);
        setSuccessMessage(`Business Unit "${buName}" updated successfully.`);
      } else {
        await createBusinessUnit(payload);
        setSuccessMessage(`Business Unit "${buName}" created successfully.`);
      }

      setIsBuModalOpen(false);
      await loadStructureData();
    } catch (err: unknown) {
      setBuFormError(err instanceof Error ? err.message : 'Failed to save business unit');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Division (Create or Update)
  const handleSubmitDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!divParentBuId) {
      setDivFormError('Parent business unit is required');
      return;
    }
    if (!divName.trim()) {
      setDivFormError('Division name is required');
      return;
    }

    try {
      setActionLoading(true);
      setDivFormError(null);
      const payload: CreateDivisionPayload = {
        businessUnitId: divParentBuId,
        name: divName.trim(),
        code: divCode.trim() || null,
        headEmployeeId: divHeadId || null,
        description: divDescription.trim() || null,
        status: divStatus,
      };

      if (editingDivision) {
        await updateDivision(editingDivision.id, {
          name: payload.name,
          code: payload.code,
          headEmployeeId: payload.headEmployeeId,
          description: payload.description,
        });
        setSuccessMessage(`Division "${divName}" updated successfully.`);
      } else {
        await createDivision(payload);
        setSuccessMessage(`Division "${divName}" created successfully.`);
      }

      setIsDivisionModalOpen(false);
      await loadStructureData();
    } catch (err: unknown) {
      setDivFormError(err instanceof Error ? err.message : 'Failed to save division');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivatingItem) return;
    try {
      setActionLoading(true);
      if (deactivatingItem.type === 'bu') {
        await setBusinessUnitStatus(deactivatingItem.id, 'inactive');
        setSuccessMessage(`Business Unit "${deactivatingItem.name}" deactivated.`);
      } else {
        await setDivisionStatus(deactivatingItem.id, 'inactive');
        setSuccessMessage(`Division "${deactivatingItem.name}" deactivated.`);
      }
      setDeactivatingItem(null);
      await loadStructureData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate item');
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Status Toggle (Activate)
  const handleActivateItem = async (type: 'bu' | 'division', id: string, name: string) => {
    try {
      setActionLoading(true);
      if (type === 'bu') {
        await setBusinessUnitStatus(id, 'active');
        setSuccessMessage(`Business Unit "${name}" activated.`);
      } else {
        await setDivisionStatus(id, 'active');
        setSuccessMessage(`Division "${name}" activated.`);
      }
      await loadStructureData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate item');
    } finally {
      setActionLoading(false);
    }
  };

  // Active BUs for division parent selection dropdown
  const activeBuOptions = useMemo(() => {
    if (!hierarchy) return [];
    return hierarchy.businessUnits
      .filter((b) => b.status === 'active' || b.id === presetBuIdForDivision)
      .map((b) => ({
        value: b.id,
        label: b.code ? `${b.name} (${b.code})` : b.name,
      }));
  }, [hierarchy, presetBuIdForDivision]);

  // Head employee options
  const headOptions = useMemo(() => {
    const list = heads.map((h) => ({
      value: h.id,
      label: h.designationName
        ? `${h.fullName} (${h.designationName} - ${h.employeeNumber})`
        : `${h.fullName} (${h.employeeNumber})`,
    }));
    return [{ value: '', label: 'Select Head of Unit (Optional)' }, ...list];
  }, [heads]);

  if (loading) {
    return (
      <Page maxWidth="default">
        <LoadingState label="Loading organization structure..." fill />
      </Page>
    );
  }

  const company = hierarchy?.company;
  const businessUnits = hierarchy?.businessUnits ?? [];
  const hasBusinessUnits = businessUnits.length > 0;

  return (
    <Page maxWidth="default">
      <Stack gap="lg">
        {/* Navigation Toolbar */}
        <Toolbar
          left={
            onBack ? (
              <Button variant="secondary" type="button" onClick={onBack}>
                <BezentIcon name="chevronLeft" size={16} />
                Back to Settings
              </Button>
            ) : null
          }
          right={
            <Inline gap="xs" align="center">
              <span>Settings</span>
              <span>/</span>
              <span>Organization</span>
              <span>/</span>
              <strong>Organization Structure</strong>
            </Inline>
          }
        />

        {/* Page Header */}
        <PageHeader
          title="Organization Structure"
          subtitle="Define how business units and divisions are organized within your company."
          actions={
            canManage ? (
              <Button
                variant="primary"
                type="button"
                onClick={handleOpenAddBu}
                leftIcon={<BezentIcon name="plusSign" size={16} />}
              >
                Add Business Unit
              </Button>
            ) : undefined
          }
        />

        {/* Global Notifications */}
        {error && (
          <Alert variant="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* Main 65% / 35% Explorer Workspace */}
        <Grid columns={3} gap="lg">
          {/* Left ~65% Area: Organization Hierarchy Tree (spans 2 columns) */}
          <div className="bezent-col-span-2">
            <Card variant="flat" padding="none">
              <div className="bezent-pane-header">
                <Inline gap="sm" align="center">
                  <BezentIcon name="organization" size={18} />
                  <span className="bezent-pane-header__title">
                    Hierarchy Explorer ({businessUnits.length} Business Units,{' '}
                    {hierarchy?.totalDivisions ?? 0} Divisions)
                  </span>
                </Inline>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddBu}
                    leftIcon={<BezentIcon name="plusSign" size={14} />}
                  >
                    Add Business Unit
                  </Button>
                )}
              </div>

              <CardBody>
                <Stack gap="sm">
                  {/* Fixed Root Company Node */}
                  {company && (
                    <Card
                      variant="interactive"
                      padding="md"
                      onClick={() =>
                        setSelectedNode({
                          type: 'company',
                          id: company.id,
                          data: company,
                        })
                      }
                      className={
                        selectedNode?.type === 'company' && selectedNode.id === company.id
                          ? 'is-selected'
                          : ''
                      }
                    >
                      <Inline gap="md" align="center" justify="between">
                        <Inline gap="sm" align="center">
                          <BezentIcon name="organization" size={24} />
                          <Stack gap="none">
                            <Inline gap="xs" align="center">
                              <CardTitle>{company.name}</CardTitle>
                              {company.code && <Badge variant="neutral">{company.code}</Badge>}
                            </Inline>
                            <CardDescription>
                              {company.displayName ? `${company.displayName} • ` : ''}
                              Company (Root Entity)
                            </CardDescription>
                          </Stack>
                        </Inline>
                        <Badge variant="info">Active Company</Badge>
                      </Inline>
                    </Card>
                  )}

                  {/* Business Units List */}
                  {hasBusinessUnits ? (
                    <Stack gap="xs">
                      {businessUnits.map((bu) => {
                        const isExpanded = !!expandedBuIds[bu.id];
                        const isSelected =
                          selectedNode?.type === 'business_unit' && selectedNode.id === bu.id;
                        const isInactive = bu.status === 'inactive';
                        const divisions = bu.divisions ?? [];
                        const menuKey = `bu_${bu.id}`;
                        const isMenuOpen = activeMenuKey === menuKey;

                        return (
                          <div key={bu.id}>
                            {/* Business Unit Card */}
                            <Card
                              variant="interactive"
                              padding="sm"
                              onClick={() =>
                                setSelectedNode({
                                  type: 'business_unit',
                                  id: bu.id,
                                  data: bu,
                                })
                              }
                              className={isSelected ? 'is-selected' : ''}
                            >
                              <Inline gap="sm" align="center" justify="between">
                                <Inline gap="xs" align="center">
                                  {/* Expand / Collapse Button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBuExpand(bu.id);
                                    }}
                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    <BezentIcon
                                      name={isExpanded ? 'chevronDown' : 'chevronRight'}
                                      size={16}
                                    />
                                  </Button>

                                  <BezentIcon name="briefcase" size={20} />

                                  <Stack gap="none">
                                    <Inline gap="xs" align="center">
                                      <CardTitle>{bu.name}</CardTitle>
                                      {bu.code && <Badge variant="neutral">{bu.code}</Badge>}
                                      <Badge variant={isInactive ? 'neutral' : 'success'}>
                                        {isInactive ? 'Inactive' : 'Active'}
                                      </Badge>
                                    </Inline>
                                    <CardDescription>
                                      {bu.headEmployeeName
                                        ? `Head: ${bu.headEmployeeName} • `
                                        : ''}
                                      {bu.divisionCount}{' '}
                                      {bu.divisionCount === 1 ? 'division' : 'divisions'}
                                    </CardDescription>
                                  </Stack>
                                </Inline>

                                {/* Contextual Actions */}
                                {canManage && (
                                  <div
                                    className="bezent-icon-btn-anchor"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setActiveMenuKey(isMenuOpen ? null : menuKey)
                                      }
                                      aria-label={`Options for ${bu.name}`}
                                    >
                                      <BezentIcon name="moreVertical" size={16} />
                                    </Button>

                                    {isMenuOpen && (
                                      <div className="bezent-dropdown-menu">
                                        <button
                                          type="button"
                                          className="bezent-dropdown-item"
                                          disabled={isInactive}
                                          onClick={() => {
                                            setActiveMenuKey(null);
                                            handleOpenAddDivision(bu.id);
                                          }}
                                        >
                                          <BezentIcon name="plusSign" size={14} />
                                          Add Division
                                        </button>
                                        <button
                                          type="button"
                                          className="bezent-dropdown-item"
                                          onClick={() => {
                                            setActiveMenuKey(null);
                                            handleOpenEditBu(bu);
                                          }}
                                        >
                                          <BezentIcon name="edit" size={14} />
                                          Edit Business Unit
                                        </button>
                                        {isInactive ? (
                                          <button
                                            type="button"
                                            className="bezent-dropdown-item"
                                            onClick={() => {
                                              setActiveMenuKey(null);
                                              void handleActivateItem('bu', bu.id, bu.name);
                                            }}
                                          >
                                            <BezentIcon name="check" size={14} />
                                            Activate
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            className="bezent-dropdown-item bezent-dropdown-item--danger"
                                            onClick={() => {
                                              setActiveMenuKey(null);
                                              setDeactivatingItem({
                                                type: 'bu',
                                                id: bu.id,
                                                name: bu.name,
                                              });
                                            }}
                                          >
                                            <BezentIcon name="close" size={14} />
                                            Deactivate
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Inline>
                            </Card>

                            {/* Divisions Nested Under Business Unit */}
                            {isExpanded && (
                              <div className="bezent-tree-indent">
                                <Stack gap="xs">
                                  {divisions.length > 0 ? (
                                    divisions.map((div) => {
                                      const isDivSelected =
                                        selectedNode?.type === 'division' &&
                                        selectedNode.id === div.id;
                                      const isDivInactive = div.status === 'inactive';
                                      const divMenuKey = `div_${div.id}`;
                                      const isDivMenuOpen = activeMenuKey === divMenuKey;

                                      return (
                                        <Card
                                          key={div.id}
                                          variant="interactive"
                                          padding="sm"
                                          onClick={() =>
                                            setSelectedNode({
                                              type: 'division',
                                              id: div.id,
                                              data: div,
                                            })
                                          }
                                          className={isDivSelected ? 'is-selected' : ''}
                                        >
                                          <Inline gap="sm" align="center" justify="between">
                                            <Inline gap="xs" align="center">
                                              <BezentIcon name="document" size={18} />
                                              <Stack gap="none">
                                                <Inline gap="xs" align="center">
                                                  <CardTitle>{div.name}</CardTitle>
                                                  {div.code && (
                                                    <Badge variant="neutral">{div.code}</Badge>
                                                  )}
                                                  <Badge
                                                    variant={
                                                      isDivInactive ? 'neutral' : 'success'
                                                    }
                                                  >
                                                    {isDivInactive ? 'Inactive' : 'Active'}
                                                  </Badge>
                                                </Inline>
                                                {div.headEmployeeName && (
                                                  <CardDescription>
                                                    Head: {div.headEmployeeName}
                                                  </CardDescription>
                                                )}
                                              </Stack>
                                            </Inline>

                                            {/* Division Contextual Actions */}
                                            {canManage && (
                                              <div
                                                className="bezent-icon-btn-anchor"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    setActiveMenuKey(
                                                      isDivMenuOpen ? null : divMenuKey,
                                                    )
                                                  }
                                                  aria-label={`Options for ${div.name}`}
                                                >
                                                  <BezentIcon name="moreVertical" size={16} />
                                                </Button>

                                                {isDivMenuOpen && (
                                                  <div className="bezent-dropdown-menu">
                                                    <button
                                                      type="button"
                                                      className="bezent-dropdown-item"
                                                      onClick={() => {
                                                        setActiveMenuKey(null);
                                                        handleOpenEditDivision(div);
                                                      }}
                                                    >
                                                      <BezentIcon name="edit" size={14} />
                                                      Edit Division
                                                    </button>
                                                    {isDivInactive ? (
                                                      <button
                                                        type="button"
                                                        className="bezent-dropdown-item"
                                                        onClick={() => {
                                                          setActiveMenuKey(null);
                                                          void handleActivateItem(
                                                            'division',
                                                            div.id,
                                                            div.name,
                                                          );
                                                        }}
                                                      >
                                                        <BezentIcon name="check" size={14} />
                                                        Activate
                                                      </button>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        className="bezent-dropdown-item bezent-dropdown-item--danger"
                                                        onClick={() => {
                                                          setActiveMenuKey(null);
                                                          setDeactivatingItem({
                                                            type: 'division',
                                                            id: div.id,
                                                            name: div.name,
                                                          });
                                                        }}
                                                      >
                                                        <BezentIcon name="close" size={14} />
                                                        Deactivate
                                                      </button>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </Inline>
                                        </Card>
                                      );
                                    })
                                  ) : (
                                    <div className="bezent-tree-empty-note">
                                      <Inline gap="xs" align="center" justify="between">
                                        <span className="bezent-text-muted">
                                          No divisions under {bu.name}.
                                        </span>
                                        {canManage && !isInactive && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenAddDivision(bu.id)}
                                          >
                                            + Add Division
                                          </Button>
                                        )}
                                      </Inline>
                                    </div>
                                  )}
                                </Stack>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Stack>
                  ) : (
                    /* Clean Empty State when No Business Units exist */
                    <EmptyState
                      title="No business units created yet."
                      description="Business units are optional. Create them when your organization needs another structural level."
                      primaryAction={
                        canManage
                          ? {
                              label: 'Add Business Unit',
                              onClick: handleOpenAddBu,
                            }
                          : undefined
                      }
                      primaryActionIcon={<BezentIcon name="plusSign" size={16} />}
                    />
                  )}
                </Stack>
              </CardBody>
            </Card>
          </div>

          {/* Right ~35% Area: Selected Node Details */}
          <div>
            <Card variant="flat" padding="lg">
              <CardHeader>
                <Inline gap="sm" align="center" justify="between">
                  <Inline gap="xs" align="center">
                    <BezentIcon
                      name={
                        selectedNode?.type === 'company'
                          ? 'organization'
                          : selectedNode?.type === 'business_unit'
                            ? 'briefcase'
                            : 'document'
                      }
                      size={20}
                    />
                    <CardTitle>
                      {selectedNode?.type === 'company'
                        ? 'Company Details'
                        : selectedNode?.type === 'business_unit'
                          ? 'Business Unit'
                          : 'Division Details'}
                    </CardTitle>
                  </Inline>
                  <Badge variant="info">
                    {selectedNode?.type === 'company'
                      ? 'Root'
                      : selectedNode?.type === 'business_unit'
                        ? 'Business Unit'
                        : 'Division'}
                  </Badge>
                </Inline>
              </CardHeader>

              <CardBody>
                {selectedNode?.type === 'company' && (() => {
                  const companyData = selectedNode.data as CompanySummary;
                  return (
                    <Stack gap="md">
                      <div>
                        <Label>Organization Name</Label>
                        <p className="bezent-detail-value">{companyData.name || '—'}</p>
                      </div>

                      <div>
                        <Label>Display Name</Label>
                        <p className="bezent-detail-value">{companyData.displayName || '—'}</p>
                      </div>

                      <div>
                        <Label>Organization Type</Label>
                        <p className="bezent-detail-value">{companyData.organizationType || '—'}</p>
                      </div>

                      <div>
                        <Label>Industry</Label>
                        <p className="bezent-detail-value">{companyData.industry || '—'}</p>
                      </div>

                      <div>
                        <Label>Website</Label>
                        <p className="bezent-detail-value">
                          {companyData.website ? (
                            <a
                              href={
                                companyData.website.startsWith('http')
                                  ? companyData.website
                                  : `https://${companyData.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {companyData.website}
                            </a>
                          ) : (
                            '—'
                          )}
                        </p>
                      </div>

                      <div>
                        <Label>Registered Address</Label>
                        <p className="bezent-detail-value">
                          {[
                            companyData.addressLine1,
                            companyData.addressLine2,
                            companyData.city,
                            companyData.state,
                            companyData.country,
                            companyData.postalCode,
                          ]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </p>
                      </div>

                      {onNavigateToProfile && (
                        <Button
                          variant="secondary"
                          onClick={onNavigateToProfile}
                          leftIcon={<BezentIcon name="edit" size={16} />}
                        >
                          Edit in Organization Profile
                        </Button>
                      )}
                    </Stack>
                  );
                })()}

                {selectedNode?.type === 'business_unit' && (
                  <Stack gap="md">
                    <div>
                      <Label>Name</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as BusinessUnitRecord).name}
                      </p>
                    </div>

                    <div>
                      <Label>Code</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as BusinessUnitRecord).code || '—'}
                      </p>
                    </div>

                    <div>
                      <Label>Head of Business Unit</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as BusinessUnitRecord).headEmployeeName ||
                          'Not assigned'}
                      </p>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as BusinessUnitRecord).description || '—'}
                      </p>
                    </div>

                    <div>
                      <Label>Status</Label>
                      <div>
                        <Badge
                          variant={
                            (selectedNode.data as BusinessUnitRecord).status === 'active'
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {(selectedNode.data as BusinessUnitRecord).status}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label>Divisions</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as BusinessUnitRecord).divisionCount} divisions
                      </p>
                    </div>

                    {canManage && (
                      <Stack gap="sm">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            handleOpenEditBu(selectedNode.data as BusinessUnitRecord)
                          }
                          leftIcon={<BezentIcon name="edit" size={16} />}
                        >
                          Edit Business Unit
                        </Button>
                        <Button
                          variant="outline"
                          disabled={(selectedNode.data as BusinessUnitRecord).status === 'inactive'}
                          onClick={() =>
                            handleOpenAddDivision((selectedNode.data as BusinessUnitRecord).id)
                          }
                          leftIcon={<BezentIcon name="plusSign" size={16} />}
                        >
                          Add Division
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                )}

                {selectedNode?.type === 'division' && (
                  <Stack gap="md">
                    <div>
                      <Label>Name</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as DivisionRecord).name}
                      </p>
                    </div>

                    <div>
                      <Label>Code</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as DivisionRecord).code || '—'}
                      </p>
                    </div>

                    <div>
                      <Label>Parent Business Unit</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as DivisionRecord).businessUnitName || '—'}
                      </p>
                    </div>

                    <div>
                      <Label>Head of Division</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as DivisionRecord).headEmployeeName ||
                          'Not assigned'}
                      </p>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <p className="bezent-detail-value">
                        {(selectedNode.data as DivisionRecord).description || '—'}
                      </p>
                    </div>

                    <div>
                      <Label>Status</Label>
                      <div>
                        <Badge
                          variant={
                            (selectedNode.data as DivisionRecord).status === 'active'
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {(selectedNode.data as DivisionRecord).status}
                        </Badge>
                      </div>
                    </div>

                    {canManage && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          handleOpenEditDivision(selectedNode.data as DivisionRecord)
                        }
                        leftIcon={<BezentIcon name="edit" size={16} />}
                      >
                        Edit Division
                      </Button>
                    )}
                  </Stack>
                )}
              </CardBody>
            </Card>
          </div>
        </Grid>
      </Stack>

      {/* Drawer / Modal: Add/Edit Business Unit */}
      <Modal
        isOpen={isBuModalOpen}
        onClose={() => setIsBuModalOpen(false)}
        title={editingBu ? 'Edit Business Unit' : 'Add Business Unit'}
        description="Business units represent high-level organizational groups within the company."
        size="md"
        footer={
          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              onClick={() => setIsBuModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitBu}
              loading={actionLoading}
            >
              {editingBu ? 'Save Changes' : 'Create Business Unit'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleSubmitBu}>
          <Stack gap="md">
            {buFormError && <Alert variant="danger">{buFormError}</Alert>}

            <FormField label="Business Unit Name" required>
              <Input
                value={buName}
                onChange={(e) => setBuName(e.target.value)}
                placeholder="e.g. Software Solutions, Engineering Services"
                required
              />
            </FormField>

            <FormGrid columns={2}>
              <FormField label="Business Unit Code">
                <Input
                  value={buCode}
                  onChange={(e) => setBuCode(e.target.value)}
                  placeholder="e.g. SW, ENG"
                />
              </FormField>

              <FormField label="Status">
                <Select
                  value={buStatus}
                  onChange={(e) => setBuStatus(e.target.value as 'active' | 'inactive')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </FormField>
            </FormGrid>

            <FormField label="Business Unit Head">
              <Select
                value={buHeadId}
                onChange={(e) => setBuHeadId(e.target.value)}
                options={headOptions}
              />
            </FormField>

            <FormField label="Description">
              <Input
                value={buDescription}
                onChange={(e) => setBuDescription(e.target.value)}
                placeholder="Brief description of responsibilities and scope"
              />
            </FormField>
          </Stack>
        </form>
      </Modal>

      {/* Drawer / Modal: Add/Edit Division */}
      <Modal
        isOpen={isDivisionModalOpen}
        onClose={() => setIsDivisionModalOpen(false)}
        title={editingDivision ? 'Edit Division' : 'Add Division'}
        description="Divisions belong to a parent business unit within the company."
        size="md"
        footer={
          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              onClick={() => setIsDivisionModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitDivision}
              loading={actionLoading}
            >
              {editingDivision ? 'Save Changes' : 'Create Division'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleSubmitDivision}>
          <Stack gap="md">
            {divFormError && <Alert variant="danger">{divFormError}</Alert>}

            <FormField label="Parent Business Unit" required>
              <Select
                value={divParentBuId}
                onChange={(e) => setDivParentBuId(e.target.value)}
                options={activeBuOptions}
                disabled={!!editingDivision}
              />
            </FormField>

            <FormField label="Division Name" required>
              <Input
                value={divName}
                onChange={(e) => setDivName(e.target.value)}
                placeholder="e.g. Product Development, Client Solutions"
                required
              />
            </FormField>

            <FormGrid columns={2}>
              <FormField label="Division Code">
                <Input
                  value={divCode}
                  onChange={(e) => setDivCode(e.target.value)}
                  placeholder="e.g. PROD-DEV"
                />
              </FormField>

              <FormField label="Status">
                <Select
                  value={divStatus}
                  onChange={(e) => setDivStatus(e.target.value as 'active' | 'inactive')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </FormField>
            </FormGrid>

            <FormField label="Division Head">
              <Select
                value={divHeadId}
                onChange={(e) => setDivHeadId(e.target.value)}
                options={headOptions}
              />
            </FormField>

            <FormField label="Description">
              <Input
                value={divDescription}
                onChange={(e) => setDivDescription(e.target.value)}
                placeholder="Brief description of the division"
              />
            </FormField>
          </Stack>
        </form>
      </Modal>

      {/* Confirmation Modal: Deactivation */}
      <Modal
        isOpen={!!deactivatingItem}
        onClose={() => setDeactivatingItem(null)}
        title={
          deactivatingItem?.type === 'bu'
            ? 'Deactivate Business Unit'
            : 'Deactivate Division'
        }
        size="sm"
        footer={
          <Inline gap="sm" justify="end">
            <Button
              variant="secondary"
              onClick={() => setDeactivatingItem(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeactivate}
              loading={actionLoading}
            >
              Deactivate
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <p>
            {deactivatingItem?.type === 'bu'
              ? 'This business unit will no longer be available for new assignments. Existing records will remain unchanged.'
              : 'This division will no longer be available for new assignments. Existing records will remain unchanged.'}
          </p>
        </Stack>
      </Modal>
    </Page>
  );
}
