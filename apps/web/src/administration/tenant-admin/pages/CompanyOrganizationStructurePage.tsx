import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Inline,
  Input,
  LoadingState,
  Page,
  PageHeader,
  Select,
  Stack,
  Tabs,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';
import { AddUnitModal, type UnitType } from '../components/AddUnitModal';
import { EditUnitModal, type SelectedUnitToEdit } from '../components/EditUnitModal';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  BusinessUnitRecord,
  DepartmentRecord,
  DivisionRecord,
  EligibleHead,
  OrganizationHierarchy,
  TenantAdminCompanySummary,
} from '../types/tenantAdmin.types';

type SelectedNodeType = 'company' | 'business_unit' | 'division' | 'department';

interface SelectedNodeState {
  type: SelectedNodeType;
  id: string;
  data:
    | TenantAdminCompanySummary
    | OrganizationHierarchy['company']
    | BusinessUnitRecord
    | DivisionRecord
    | DepartmentRecord;
}

export interface CompanyOrganizationStructurePageProps {
  initialHierarchy?: OrganizationHierarchy;
  initialDepartments?: DepartmentRecord[];
  initialEligibleHeads?: EligibleHead[];
}

export function CompanyOrganizationStructurePage({
  initialHierarchy,
  initialDepartments,
  initialEligibleHeads,
}: CompanyOrganizationStructurePageProps = {}) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading: isContextLoading, selectCompany } = useTenantAdmin();

  // Context resolution and tenant boundary
  const companyFromContext = useMemo(
    () => companies.find((c) => c.id === companyId) || null,
    [companies, companyId],
  );

  const [companyDetail, setCompanyDetail] = useState<TenantAdminCompanySummary | null>(null);
  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(initialHierarchy ?? null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>(initialDepartments ?? []);
  const [eligibleHeads, setEligibleHeads] = useState<EligibleHead[]>(initialEligibleHeads ?? []);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(!initialHierarchy);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  // Search & Type Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'business_unit' | 'division' | 'department'>('all');

  // Expansion state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { company_root: true };
    if (initialHierarchy) {
      initialHierarchy.businessUnits.forEach((bu) => {
        init[`bu_${bu.id}`] = true;
        (bu.divisions || []).forEach((div) => {
          init[`div_${div.id}`] = true;
        });
      });
    }
    return init;
  });

  // Selected node state
  const [selectedNode, setSelectedNode] = useState<SelectedNodeState | null>(() => {
    if (initialHierarchy) {
      return {
        type: 'company',
        id: 'company_root',
        data: initialHierarchy.company,
      };
    }
    return null;
  });

  // Modals state
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [addUnitDefaultType, setAddUnitDefaultType] = useState<UnitType>('business_unit');
  const [addUnitDefaultParentId, setAddUnitDefaultParentId] = useState<string | undefined>(undefined);
  const [isEditUnitModalOpen, setIsEditUnitModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<SelectedUnitToEdit | null>(null);

  const effectiveCompany: TenantAdminCompanySummary | null = useMemo(
    () => companyDetail || companyFromContext,
    [companyDetail, companyFromContext],
  );

  // Load organization data
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingData(true);
    setError(null);

    try {
      if (selectCompany) {
        selectCompany(companyId);
      }

      // Fetch company profile, hierarchy, departments, eligible heads concurrently
      const [profileRes, hierarchyRes, departmentsRes, headsRes] = await Promise.all([
        tenantAdminApi.getCompanyProfile(companyId).catch(() => null),
        tenantAdminApi.getCompanyOrgHierarchy(companyId),
        tenantAdminApi.getCompanyDepartments(companyId).catch(() => []),
        tenantAdminApi.getCompanyEligibleHeads(companyId).catch(() => []),
      ]);

      if (profileRes) {
        setCompanyDetail(profileRes);
      }
      setHierarchy(hierarchyRes);
      setDepartments(departmentsRes);
      setEligibleHeads(headsRes);

      // Default expand all business units and divisions
      const initialExpanded: Record<string, boolean> = { company_root: true };
      hierarchyRes.businessUnits.forEach((bu) => {
        initialExpanded[`bu_${bu.id}`] = true;
        (bu.divisions || []).forEach((div) => {
          initialExpanded[`div_${div.id}`] = true;
        });
      });
      setExpandedNodes((prev) => ({ ...initialExpanded, ...prev }));

      // Default selected node: Company root
      setSelectedNode((prev) => {
        if (!prev || prev.type === 'company') {
          return {
            type: 'company',
            id: 'company_root',
            data: profileRes || hierarchyRes.company,
          };
        }
        return prev;
      });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 403 || status === 404) {
        setAccessDenied(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load organization structure';
        setError(msg);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [companyId, selectCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate divisions from all business units
  const allDivisions: DivisionRecord[] = useMemo(() => {
    if (!hierarchy) return [];
    return hierarchy.businessUnits.flatMap((bu) => bu.divisions || []);
  }, [hierarchy]);

  // Group departments by division
  const departmentsByDivision = useMemo(() => {
    const map = new Map<string, DepartmentRecord[]>();
    departments.forEach((dept) => {
      if (dept.divisionId) {
        const list = map.get(dept.divisionId) ?? [];
        list.push(dept);
        map.set(dept.divisionId, list);
      }
    });
    return map;
  }, [departments]);

  // Cross-tenant boundary check
  const isForeignCompany = !isContextLoading && companies.length > 0 && !companyFromContext;
  if (accessDenied || isForeignCompany || (!isContextLoading && !isLoadingData && !effectiveCompany)) {
    return (
      <Page>
        <EmptyState
          title="Company Not Found or Access Denied"
          description={`Company '${companyId}' was not found or belongs to another tenant organization. Cross-tenant access is prohibited.`}
          primaryAction={{
            label: 'Back to Companies',
            onClick: () => navigate('/tenant-admin/tenant/companies'),
          }}
        />
      </Page>
    );
  }

  if (isContextLoading || (!effectiveCompany && isLoadingData)) {
    return (
      <Page>
        <LoadingState label="Loading organization workspace..." fill />
      </Page>
    );
  }

  if (!effectiveCompany) {
    return null;
  }

  const businessUnits = hierarchy?.businessUnits || [];
  const totalBUs = businessUnits.length;
  const totalDivisions = allDivisions.length;
  const totalDepartments = departments.length;
  const isOrgEmpty = totalBUs === 0;

  // Toggle expansion for a node
  const toggleNode = (nodeKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeKey]: !prev[nodeKey],
    }));
  };

  // Open context-aware Add Unit Modal
  const handleOpenAddUnit = (overrideType?: UnitType, overrideParentId?: string) => {
    if (overrideType) {
      setAddUnitDefaultType(overrideType);
      setAddUnitDefaultParentId(overrideParentId);
    } else if (selectedNode) {
      if (selectedNode.type === 'company') {
        setAddUnitDefaultType('business_unit');
        setAddUnitDefaultParentId(undefined);
      } else if (selectedNode.type === 'business_unit') {
        setAddUnitDefaultType('division');
        setAddUnitDefaultParentId(selectedNode.id.replace('bu_', ''));
      } else if (selectedNode.type === 'division') {
        setAddUnitDefaultType('department');
        setAddUnitDefaultParentId(selectedNode.id.replace('div_', ''));
      } else if (selectedNode.type === 'department') {
        const dept = selectedNode.data as DepartmentRecord;
        setAddUnitDefaultType('department');
        setAddUnitDefaultParentId(dept.divisionId || undefined);
      }
    } else {
      setAddUnitDefaultType('business_unit');
      setAddUnitDefaultParentId(undefined);
    }
    setIsAddUnitModalOpen(true);
  };

  // Open Edit Unit Modal
  const handleOpenEditUnit = (
    type: 'business_unit' | 'division' | 'department',
    data: BusinessUnitRecord | DivisionRecord | DepartmentRecord,
  ) => {
    setUnitToEdit({ type, data });
    setIsEditUnitModalOpen(true);
  };

  // Search filtering logic
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const isMatch = (name: string, code?: string | null) => {
    if (!normalizedQuery) return true;
    if (name.toLowerCase().includes(normalizedQuery)) return true;
    if (code && code.toLowerCase().includes(normalizedQuery)) return true;
    return false;
  };

  return (
    <Page>
      <Stack gap="lg">
        {/* 1. Canonical Workspace Header (activeSection="organization") */}
        <CompanyWorkspaceHeader
          company={effectiveCompany}
          activeSection="organization"
        />

        {/* 2. Organization Section Sub-Header & Sub-Navigation */}
        <PageHeader
          title="Organization"
          subtitle="Manage the company's organizational structure and work locations."
        />

        <Tabs
          activeId="structure"
          onChange={(id) => {
            if (id === 'locations') {
              navigate(
                `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/organization/work-locations`,
              );
            }
          }}
          items={[
            { id: 'structure', label: 'Structure' },
            { id: 'locations', label: 'Work Locations' },
          ]}
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

        {/* 3. Structure Toolbar */}
        <div className="bezent-structure-toolbar">
          <h2 className="bezent-structure-toolbar__title">Organization Structure</h2>

          {!isLoadingData && !isOrgEmpty && (
            <div className="bezent-structure-toolbar__actions">
              <div className="bezent-structure-toolbar__search">
                <Input
                  placeholder="Search units..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<BezentIcon name="search" size={16} />}
                  size="sm"
                />
              </div>

              <div className="bezent-structure-toolbar__filter">
                <Select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as 'all' | 'business_unit' | 'division' | 'department')
                  }
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'business_unit', label: 'Business Unit' },
                    { value: 'division', label: 'Division' },
                    { value: 'department', label: 'Department' },
                  ]}
                  size="sm"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenAddUnit()}
                leftIcon={<BezentIcon name="plusSign" size={14} />}
              >
                Add Unit
              </Button>
            </div>
          )}
        </div>

        {/* 4. Main Structure Workspace */}
        {isLoadingData ? (
          <div className="bezent-structure-panel">
            <div className="bezent-structure-panel__body">
              <LoadingState label="Loading organization structure..." fill />
            </div>
          </div>
        ) : isOrgEmpty ? (
          <div className="bezent-structure-panel">
            <div className="bezent-structure-panel__body">
              <EmptyState
                title="No organization units yet."
                description={`Start by creating the first business unit for ${effectiveCompany.displayName || effectiveCompany.name}.`}
                primaryAction={{
                  label: '+ Add Business Unit',
                  onClick: () => handleOpenAddUnit('business_unit'),
                }}
              />
            </div>
          </div>
        ) : (
          <div className="bezent-structure-layout">
            {/* Left Panel: Hierarchy Explorer (55-60%) */}
            <div className="bezent-structure-panel">
              <div className="bezent-structure-panel__header">
                <div className="bezent-structure-panel__title">
                  <BezentIcon name="organization" size={16} />
                  <span>Hierarchy Explorer</span>
                </div>
                <Inline gap="xs" align="center">
                  <Badge variant="neutral">{totalBUs} BUs</Badge>
                  <Badge variant="neutral">{totalDivisions} Divs</Badge>
                  <Badge variant="neutral">{totalDepartments} Depts</Badge>
                </Inline>
              </div>

              <div className="bezent-structure-panel__body">
                <div className="bezent-tree-container" role="tree" aria-label="Organization Structure Hierarchy">
                  {/* Root Company Node */}
                  {(typeFilter === 'all' || isMatch(effectiveCompany.name, effectiveCompany.code)) && (
                    <div
                      className={`bezent-tree-node bezent-tree-node__indent-0 ${
                        selectedNode?.type === 'company' ? 'is-selected' : ''
                      }`}
                      role="treeitem"
                      aria-selected={selectedNode?.type === 'company'}
                      tabIndex={0}
                      onClick={() =>
                        setSelectedNode({
                          type: 'company',
                          id: 'company_root',
                          data: effectiveCompany,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedNode({
                            type: 'company',
                            id: 'company_root',
                            data: effectiveCompany,
                          });
                        }
                      }}
                    >
                      <div className="bezent-tree-node__left">
                        <button
                          type="button"
                          className="bezent-tree-node__toggle"
                          onClick={(e) => toggleNode('company_root', e)}
                          aria-label={expandedNodes['company_root'] ? 'Collapse' : 'Expand'}
                        >
                          <BezentIcon
                            name={expandedNodes['company_root'] ? 'chevronDown' : 'chevronRight'}
                            size={14}
                          />
                        </button>
                        <span className="bezent-tree-node__icon">
                          <BezentIcon name="organization" size={16} />
                        </span>
                        <span className="bezent-tree-node__name">{effectiveCompany.name}</span>
                      </div>
                      <div className="bezent-tree-node__right">
                        <span className="bezent-tree-node__type-badge">Company</span>
                      </div>
                    </div>
                  )}

                  {/* Business Units and their descendants */}
                  {(expandedNodes['company_root'] || normalizedQuery) &&
                    businessUnits.map((bu) => {
                      const buKey = `bu_${bu.id}`;
                      const buDivisions = bu.divisions || [];
                      const buDepartments = buDivisions.flatMap(
                        (div) => departmentsByDivision.get(div.id) || [],
                      );

                      // Check if BU or any descendant matches search
                      const buDirectMatch = isMatch(bu.name, bu.code);
                      const descendantDivMatch = buDivisions.some((d) => isMatch(d.name, d.code));
                      const descendantDeptMatch = buDepartments.some((d) => isMatch(d.name, d.code));
                      const buHasMatch = buDirectMatch || descendantDivMatch || descendantDeptMatch;

                      if (normalizedQuery && !buHasMatch) return null;
                      if (typeFilter === 'department' && !descendantDeptMatch && buDepartments.length === 0) return null;
                      if (typeFilter === 'division' && !descendantDivMatch && buDivisions.length === 0) return null;

                      const isBuExpanded = !!expandedNodes[buKey] || Boolean(normalizedQuery);
                      const isBuSelected =
                        selectedNode?.type === 'business_unit' && selectedNode.id === buKey;

                      return (
                        <div key={bu.id} className="bezent-tree-item">
                          {/* Business Unit Row */}
                          {(typeFilter === 'all' || typeFilter === 'business_unit' || buHasMatch) && (
                            <div
                              className={`bezent-tree-node bezent-tree-node__indent-1 ${
                                isBuSelected ? 'is-selected' : ''
                              }`}
                              role="treeitem"
                              aria-selected={isBuSelected}
                              tabIndex={0}
                              onClick={() =>
                                setSelectedNode({
                                  type: 'business_unit',
                                  id: buKey,
                                  data: bu,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  setSelectedNode({
                                    type: 'business_unit',
                                    id: buKey,
                                    data: bu,
                                  });
                                }
                              }}
                            >
                              <div className="bezent-tree-node__left">
                                {buDivisions.length > 0 ? (
                                  <button
                                    type="button"
                                    className="bezent-tree-node__toggle"
                                    onClick={(e) => toggleNode(buKey, e)}
                                    aria-label={isBuExpanded ? 'Collapse' : 'Expand'}
                                  >
                                    <BezentIcon
                                      name={isBuExpanded ? 'chevronDown' : 'chevronRight'}
                                      size={14}
                                    />
                                  </button>
                                ) : (
                                  <span className="bezent-tree-node__toggle-spacer" />
                                )}
                                <span className="bezent-tree-node__icon">
                                  <BezentIcon name="operations" size={16} />
                                </span>
                                <span className="bezent-tree-node__name">{bu.name}</span>
                              </div>
                              <div className="bezent-tree-node__right">
                                {bu.code && <Badge variant="neutral">{bu.code}</Badge>}
                                <span className="bezent-tree-node__type-badge">Business Unit</span>
                                {bu.status === 'inactive' && (
                                  <Badge variant="neutral">Inactive</Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Divisions under this BU */}
                          {isBuExpanded &&
                            buDivisions.map((div) => {
                              const divKey = `div_${div.id}`;
                              const divDepts = departmentsByDivision.get(div.id) || [];

                              const divDirectMatch = isMatch(div.name, div.code);
                              const deptMatch = divDepts.some((dept) => isMatch(dept.name, dept.code));
                              const divHasMatch = divDirectMatch || deptMatch;

                              if (normalizedQuery && !divHasMatch) return null;
                              if (typeFilter === 'business_unit') return null;
                              if (typeFilter === 'department' && !deptMatch && divDepts.length === 0) return null;

                              const isDivExpanded =
                                !!expandedNodes[divKey] || Boolean(normalizedQuery);
                              const isDivSelected =
                                selectedNode?.type === 'division' && selectedNode.id === divKey;

                              return (
                                <div key={div.id} className="bezent-tree-item">
                                  {/* Division Row */}
                                  {(typeFilter === 'all' || typeFilter === 'division' || divHasMatch) && (
                                    <div
                                      className={`bezent-tree-node bezent-tree-node__indent-2 ${
                                        isDivSelected ? 'is-selected' : ''
                                      }`}
                                      role="treeitem"
                                      aria-selected={isDivSelected}
                                      tabIndex={0}
                                      onClick={() =>
                                        setSelectedNode({
                                          type: 'division',
                                          id: divKey,
                                          data: div,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          setSelectedNode({
                                            type: 'division',
                                            id: divKey,
                                            data: div,
                                          });
                                        }
                                      }}
                                    >
                                      <div className="bezent-tree-node__left">
                                        {divDepts.length > 0 ? (
                                          <button
                                            type="button"
                                            className="bezent-tree-node__toggle"
                                            onClick={(e) => toggleNode(divKey, e)}
                                            aria-label={isDivExpanded ? 'Collapse' : 'Expand'}
                                          >
                                            <BezentIcon
                                              name={isDivExpanded ? 'chevronDown' : 'chevronRight'}
                                              size={14}
                                            />
                                          </button>
                                        ) : (
                                          <span className="bezent-tree-node__toggle-spacer" />
                                        )}
                                        <span className="bezent-tree-node__icon">
                                          <BezentIcon name="pipeline" size={16} />
                                        </span>
                                        <span className="bezent-tree-node__name">{div.name}</span>
                                      </div>
                                      <div className="bezent-tree-node__right">
                                        {div.code && <Badge variant="neutral">{div.code}</Badge>}
                                        <span className="bezent-tree-node__type-badge">Division</span>
                                        {div.status === 'inactive' && (
                                          <Badge variant="neutral">Inactive</Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Departments under this Division */}
                                  {isDivExpanded &&
                                    divDepts.map((dept) => {
                                      const deptKey = `dept_${dept.id}`;
                                      const deptMatches = isMatch(dept.name, dept.code);

                                      if (normalizedQuery && !deptMatches) return null;
                                      if (typeFilter === 'division') {
                                        return null;
                                      }

                                      const isDeptSelected =
                                        selectedNode?.type === 'department' &&
                                        selectedNode.id === deptKey;

                                      return (
                                        <div
                                          key={dept.id}
                                          className={`bezent-tree-node bezent-tree-node__indent-3 ${
                                            isDeptSelected ? 'is-selected' : ''
                                          }`}
                                          role="treeitem"
                                          aria-selected={isDeptSelected}
                                          tabIndex={0}
                                          onClick={() =>
                                            setSelectedNode({
                                              type: 'department',
                                              id: deptKey,
                                              data: dept,
                                            })
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              setSelectedNode({
                                                type: 'department',
                                                id: deptKey,
                                                data: dept,
                                              });
                                            }
                                          }}
                                        >
                                          <div className="bezent-tree-node__left">
                                            <span className="bezent-tree-node__toggle-spacer" />
                                            <span className="bezent-tree-node__icon">
                                              <BezentIcon name="employees" size={16} />
                                            </span>
                                            <span className="bezent-tree-node__name">{dept.name}</span>
                                          </div>
                                          <div className="bezent-tree-node__right">
                                            {dept.code && <Badge variant="neutral">{dept.code}</Badge>}
                                            <span className="bezent-tree-node__type-badge">Department</span>
                                            {dept.status === 'inactive' && (
                                              <Badge variant="neutral">Inactive</Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right Panel: Selected Unit Details (40-45%) */}
            <div className="bezent-structure-panel">
              <div className="bezent-structure-panel__header">
                <div className="bezent-structure-panel__title">
                  <BezentIcon name="organization" size={16} />
                  <span>Selected Unit Details</span>
                </div>
              </div>

              <div className="bezent-structure-panel__body">
                {/* 1. Company Selected */}
                {(!selectedNode || selectedNode.type === 'company') && (
                  <div className="bezent-unit-details">
                    <div className="bezent-unit-details__header">
                      <div className="bezent-unit-details__title-group">
                        <h3 className="bezent-unit-details__title">{effectiveCompany.name}</h3>
                        <span className="bezent-unit-details__type">Company (Root Organization Entity)</span>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>

                    {/* Summary metrics strip */}
                    <div className="bezent-unit-details__stats">
                      <div className="bezent-unit-details__stat">
                        <span className="bezent-unit-details__stat-value">{totalBUs}</span>
                        <span className="bezent-unit-details__stat-label">Business Units</span>
                      </div>
                      <div className="bezent-unit-details__stat">
                        <span className="bezent-unit-details__stat-value">{totalDivisions}</span>
                        <span className="bezent-unit-details__stat-label">Divisions</span>
                      </div>
                      <div className="bezent-unit-details__stat">
                        <span className="bezent-unit-details__stat-value">{totalDepartments}</span>
                        <span className="bezent-unit-details__stat-label">Departments</span>
                      </div>
                    </div>

                    <div className="bezent-unit-details__fields">
                      <div className="bezent-unit-details__field">
                        <span className="bezent-unit-details__field-label">Company Code</span>
                        <span className="bezent-unit-details__field-value">
                          {effectiveCompany.code || '—'}
                        </span>
                      </div>
                      <div className="bezent-unit-details__field">
                        <span className="bezent-unit-details__field-label">Organization Type</span>
                        <span className="bezent-unit-details__field-value">
                          {effectiveCompany.organizationType || 'Corporate Entity'}
                        </span>
                      </div>
                      <div className="bezent-unit-details__field">
                        <span className="bezent-unit-details__field-label">Country</span>
                        <span className="bezent-unit-details__field-value">
                          {effectiveCompany.country || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Business Unit Selected */}
                {selectedNode?.type === 'business_unit' && (
                  (() => {
                    const bu = selectedNode.data as BusinessUnitRecord;
                    const buDivs = bu.divisions || [];
                    const buDeptsCount = buDivs.reduce(
                      (acc, d) => acc + (departmentsByDivision.get(d.id)?.length || 0),
                      0,
                    );

                    return (
                      <div className="bezent-unit-details">
                        <div className="bezent-unit-details__header">
                          <div className="bezent-unit-details__title-group">
                            <h3 className="bezent-unit-details__title">{bu.name}</h3>
                            <span className="bezent-unit-details__type">Business Unit</span>
                          </div>
                          <Badge variant={bu.status === 'active' ? 'success' : 'neutral'}>
                            {bu.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        {/* Counts */}
                        <div className="bezent-unit-details__stats">
                          <div className="bezent-unit-details__stat">
                            <span className="bezent-unit-details__stat-value">{buDivs.length}</span>
                            <span className="bezent-unit-details__stat-label">Divisions</span>
                          </div>
                          <div className="bezent-unit-details__stat">
                            <span className="bezent-unit-details__stat-value">{buDeptsCount}</span>
                            <span className="bezent-unit-details__stat-label">Departments</span>
                          </div>
                        </div>

                        <div className="bezent-unit-details__fields">
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Code</span>
                            <span className="bezent-unit-details__field-value">{bu.code || '—'}</span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Parent</span>
                            <span className="bezent-unit-details__field-value">
                              {effectiveCompany.name} (Company)
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Head of Unit</span>
                            <span className="bezent-unit-details__field-value">
                              {bu.headEmployeeName || 'Not assigned'}
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Description</span>
                            <span className="bezent-unit-details__field-value">
                              {bu.description || '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bezent-unit-details__actions">
                          <Inline gap="sm">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAddUnit('division', bu.id)}
                              leftIcon={<BezentIcon name="plusSign" size={14} />}
                            >
                              Add Division
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenEditUnit('business_unit', bu)}
                            >
                              Edit Unit
                            </Button>
                          </Inline>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 3. Division Selected */}
                {selectedNode?.type === 'division' && (
                  (() => {
                    const div = selectedNode.data as DivisionRecord;
                    const divDepts = departmentsByDivision.get(div.id) || [];
                    const parentBu = businessUnits.find((b) => b.id === div.businessUnitId);

                    return (
                      <div className="bezent-unit-details">
                        <div className="bezent-unit-details__header">
                          <div className="bezent-unit-details__title-group">
                            <h3 className="bezent-unit-details__title">{div.name}</h3>
                            <span className="bezent-unit-details__type">Division</span>
                          </div>
                          <Badge variant={div.status === 'active' ? 'success' : 'neutral'}>
                            {div.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="bezent-unit-details__stats">
                          <div className="bezent-unit-details__stat">
                            <span className="bezent-unit-details__stat-value">{divDepts.length}</span>
                            <span className="bezent-unit-details__stat-label">Departments</span>
                          </div>
                        </div>

                        <div className="bezent-unit-details__fields">
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Code</span>
                            <span className="bezent-unit-details__field-value">{div.code || '—'}</span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Parent Business Unit</span>
                            <span className="bezent-unit-details__field-value">
                              {div.businessUnitName || parentBu?.name || '—'}
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Head of Division</span>
                            <span className="bezent-unit-details__field-value">
                              {div.headEmployeeName || 'Not assigned'}
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Description</span>
                            <span className="bezent-unit-details__field-value">
                              {div.description || '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bezent-unit-details__actions">
                          <Inline gap="sm">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAddUnit('department', div.id)}
                              leftIcon={<BezentIcon name="plusSign" size={14} />}
                            >
                              Add Department
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenEditUnit('division', div)}
                            >
                              Edit Unit
                            </Button>
                          </Inline>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 4. Department Selected */}
                {selectedNode?.type === 'department' && (
                  (() => {
                    const dept = selectedNode.data as DepartmentRecord;
                    const parentDiv = allDivisions.find((d) => d.id === dept.divisionId);
                    const parentBu = businessUnits.find((b) => b.id === (dept.businessUnitId || parentDiv?.businessUnitId));

                    return (
                      <div className="bezent-unit-details">
                        <div className="bezent-unit-details__header">
                          <div className="bezent-unit-details__title-group">
                            <h3 className="bezent-unit-details__title">{dept.name}</h3>
                            <span className="bezent-unit-details__type">Department</span>
                          </div>
                          <Badge variant={dept.status === 'active' ? 'success' : 'neutral'}>
                            {dept.status === 'active' ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="bezent-unit-details__fields">
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Code</span>
                            <span className="bezent-unit-details__field-value">{dept.code || '—'}</span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Parent Division</span>
                            <span className="bezent-unit-details__field-value">
                              {dept.divisionName || parentDiv?.name || '—'}
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Business Unit</span>
                            <span className="bezent-unit-details__field-value">
                              {dept.businessUnitName || parentBu?.name || '—'}
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Head of Department</span>
                            <span className="bezent-unit-details__field-value">
                              {dept.headEmployeeName || 'Not assigned'}
                            </span>
                          </div>
                          <div className="bezent-unit-details__field">
                            <span className="bezent-unit-details__field-label">Description</span>
                            <span className="bezent-unit-details__field-value">
                              {dept.description || '—'}
                            </span>
                          </div>
                        </div>

                        <div className="bezent-unit-details__actions">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenEditUnit('department', dept)}
                          >
                            Edit Unit
                          </Button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Drawers and Modals */}
        <AddUnitModal
          isOpen={isAddUnitModalOpen}
          onClose={() => setIsAddUnitModalOpen(false)}
          company={effectiveCompany}
          businessUnits={businessUnits}
          divisions={allDivisions}
          eligibleHeads={eligibleHeads}
          initialUnitType={addUnitDefaultType}
          initialParentId={addUnitDefaultParentId}
          onSuccess={async () => {
            await loadData();
            setSuccessMessage('Organization unit created successfully.');
          }}
        />

        <EditUnitModal
          isOpen={isEditUnitModalOpen}
          onClose={() => {
            setIsEditUnitModalOpen(false);
            setUnitToEdit(null);
          }}
          company={effectiveCompany}
          selectedUnit={unitToEdit}
          businessUnits={businessUnits}
          divisions={allDivisions}
          eligibleHeads={eligibleHeads}
          onSuccess={async () => {
            await loadData();
            setSuccessMessage('Organization unit updated successfully.');
          }}
        />
      </Stack>
    </Page>
  );
}
