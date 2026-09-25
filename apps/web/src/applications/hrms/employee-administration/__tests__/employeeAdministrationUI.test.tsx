import { describe, it, expect, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeAdministrationPage } from '../pages/EmployeeAdministrationPage';
import { ActionQueue } from '../components/ActionQueue';
import { EmployeeActionForm } from '../components/EmployeeActionForm';
import { EmployeeActionDetail } from '../components/EmployeeActionDetail';
import { ProbationQueue } from '../components/ProbationQueue';
import {
  ACTION_TYPES,
  EMPTY_ACTION_FORM,
  validateActionForm,
  type ActionFormState,
} from '../model/actionCatalog';
import type {
  EmployeeActionDetail as EmployeeActionDetailData,
  EmployeeActionListItem,
  EmployeeRecord,
  OrganizationMasters,
} from '../api/employeeAdministrationApi';

const noop = () => {};

const masters: OrganizationMasters = {
  company: { id: 'comp_demo_01', name: 'BEZENT Demo Pvt Ltd', code: 'BEZENT_DEMO' },
  departments: [
    { id: 'dept_eng_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_prod_01', name: 'Product', code: 'PROD' },
  ],
  designations: [
    { id: 'desig_se_01', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_pm_01', name: 'Product Manager', code: 'PM' },
  ],
  locations: [
    { id: 'loc_chn_01', name: 'Chennai (HQ)', code: 'CHN' },
    { id: 'loc_blr_01', name: 'Bengaluru', code: 'BLR' },
  ],
};

const kavya: EmployeeRecord = {
  id: 'emp_demo_003',
  employeeNumber: 'EMP-0003',
  firstName: 'Kavya',
  lastName: 'Iyer',
  fullName: 'Kavya Iyer',
  email: 'kavya.iyer@bezent-demo.example',
  phone: null,
  departmentId: 'dept_eng_01',
  departmentName: 'Engineering',
  designationId: 'desig_se_01',
  designationName: 'Software Engineer',
  locationId: 'loc_chn_01',
  locationName: 'Chennai (HQ)',
  reportingManagerId: 'emp_demo_002',
  reportingManagerName: 'Arjun Mehta',
  joiningDate: '2026-06-01',
  probationEndDate: '2026-12-01',
  confirmationDate: null,
  lastWorkingDate: null,
  employmentType: 'full_time',
  employmentStatus: 'probation',
};

const arjun: EmployeeRecord = {
  ...kavya,
  id: 'emp_demo_002',
  employeeNumber: 'EMP-0002',
  firstName: 'Arjun',
  lastName: 'Mehta',
  fullName: 'Arjun Mehta',
  reportingManagerId: null,
  reportingManagerName: null,
  employmentStatus: 'active',
};

const departmentChange: EmployeeActionListItem = {
  id: 'ea_1',
  employeeId: kavya.id,
  employeeNumber: 'EMP-0003',
  employeeName: 'Kavya Iyer',
  actionType: 'department_change',
  category: 'job_changes',
  status: 'pending',
  effectiveDate: '2026-10-01',
  reason: 'Moving to the product team',
  changes: [
    {
      field: 'departmentId',
      from: 'dept_eng_01',
      fromLabel: 'Engineering',
      to: 'dept_prod_01',
      toLabel: 'Product',
    },
  ],
  requestDate: null,
  requestedBy: null,
  cancellationReason: null,
  appliedAt: null,
  cancelledAt: null,
  version: 1,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
};

function renderForm(form: Partial<ActionFormState>, actionTypeLabel?: string) {
  return renderToStaticMarkup(
    <EmployeeActionForm
      form={{ ...EMPTY_ACTION_FORM, ...form }}
      errors={{}}
      employees={[kavya, arjun]}
      masters={masters}
      actionTypes={ACTION_TYPES}
      actionTypeLabel={actionTypeLabel}
      employeeSearch=""
      onEmployeeSearchChange={noop}
      onChange={noop}
    />,
  );
}

describe('Employee Administration page', () => {
  it('renders header, description, primary action, and all action tabs', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeAdministrationPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Employee Administration');
    expect(html).toContain(
      'Manage employee changes, confirmations, transfers and employment actions.',
    );
    expect(html).toContain('New Employee Action');
    for (const tab of [
      'All Actions',
      'Job Changes',
      'Probation &amp; Confirmation',
      'Transfers',
      'Employment Status',
      'Separation',
    ]) {
      expect(html).toContain(tab);
    }
    // Default tab is All Actions and data is loading from the server.
    expect(html).toMatch(/aria-selected="true"[^>]*>(?:(?!<\/button>).)*All Actions/);
    expect(html).toContain('Loading employee actions');
  });

  it('contains no onboarding content', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeAdministrationPage />
      </MemoryRouter>,
    );
    expect(html).not.toContain('Add New Hire');
    expect(html).not.toContain('View Drafts');
    expect(html).not.toContain('Preboarding');
    expect(html).not.toContain('Onboarding');
  });
});

describe('ActionQueue', () => {
  it('renders server-backed actions with current → new values', () => {
    const html = renderToStaticMarkup(
      <ActionQueue
        status="ready"
        items={[departmentChange]}
        onRetry={noop}
        onOpen={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('EMP-0003');
    expect(html).toContain('Department Change');
    expect(html).toContain('Engineering → Product');
    expect(html).toContain('Oct 1, 2026');
    expect(html).toContain('Pending');
    expect(html).toContain('Requested By');
    expect(html).toContain('View');
  });

  it('shows a loading state', () => {
    const html = renderToStaticMarkup(
      <ActionQueue
        status="loading"
        items={[]}
        onRetry={noop}
        onOpen={noop}
        onOpenEmployee={noop}
      />,
    );
    expect(html).toContain('Loading employee actions');
  });

  it('shows an error state with retry', () => {
    const html = renderToStaticMarkup(
      <ActionQueue
        status="error"
        items={[]}
        error="Database service is unavailable"
        onRetry={noop}
        onOpen={noop}
        onOpenEmployee={noop}
      />,
    );
    expect(html).toContain('Employee actions could not be loaded');
    expect(html).toContain('Database service is unavailable');
    expect(html).toContain('Retry');
  });

  it('describes actions, not employees, when empty', () => {
    const html = renderToStaticMarkup(
      <ActionQueue
        status="ready"
        items={[]}
        onRetry={noop}
        onOpen={noop}
        onOpenEmployee={noop}
        onCreate={noop}
      />,
    );
    expect(html).toContain('No employee actions yet.');
    expect(html).not.toContain('No employees yet');
    expect(html).toContain('New Employee Action');

    const filtered = renderToStaticMarkup(
      <ActionQueue
        status="ready"
        items={[]}
        filtered
        onRetry={noop}
        onOpen={noop}
        onOpenEmployee={noop}
      />,
    );
    expect(filtered).toContain('No matching employee actions');
  });
});

describe('New Employee Action flow', () => {
  it('step 1 starts with employee selection; action type waits for an employee', () => {
    const html = renderForm({});
    expect(html).toContain('1. Select Employee');
    expect(html).toContain('Kavya Iyer (EMP-0003)');
    expect(html).toContain('2. Select Action Type');
    expect(html).toMatch(/<select[^>]*id="employee-action-type"[^>]*disabled/);
    expect(html).not.toContain('Details');
  });

  it('offers every V1 action type grouped by category', () => {
    const html = renderForm({ employeeId: kavya.id });
    for (const label of [
      'Department Change',
      'Designation Change',
      'Reporting Manager Change',
      'Employment Type Change',
      'Confirm Employee',
      'Extend Probation',
      'Location Transfer',
      'Employment Status Change',
      'Resignation',
      'Termination',
    ]) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain('optgroup label="Job Changes"');
    expect(html).toContain('optgroup label="Separation"');
  });

  it('department change renders only its relevant fields with server master data', () => {
    const html = renderForm({ employeeId: kavya.id, actionType: 'department_change' });

    expect(html).toContain('3. Department Change Details');
    expect(html).toContain('Current Department');
    expect(html).toContain('value="Engineering"');
    expect(html).toContain('New Department');
    expect(html).toContain('New Designation');
    expect(html).toContain('Reporting Manager');
    expect(html).toContain('Effective Date');
    expect(html).toContain('Reason');
    expect(html).toContain('>Product<');
    expect(html).toContain('Arjun Mehta (EMP-0002)');
    // The employee cannot be their own reporting manager.
    expect(html.match(/Kavya Iyer \(EMP-0003\)/g)?.length).toBeLessThanOrEqual(2);
    expect(html).not.toContain('Last Working Date');
    expect(html).not.toContain('New Probation End Date');
  });

  it('probation decisions show joining date and current probation end', () => {
    const confirm = renderForm(
      { employeeId: kavya.id, actionType: 'confirm_employee' },
      'Decision',
    );
    expect(confirm).toContain('2. Select Decision');
    expect(confirm).toContain('Joining Date');
    expect(confirm).toContain('value="Jun 1, 2026"');
    expect(confirm).toContain('Current Probation End');
    expect(confirm).toContain('value="Dec 1, 2026"');
    expect(confirm).toContain('Effective Date');
    expect(confirm).not.toContain('New Probation End Date');

    const extend = renderForm({ employeeId: kavya.id, actionType: 'extend_probation' });
    expect(extend).toContain('New Probation End Date');
  });

  it('separation captures request and last working dates without a separate effective date', () => {
    const html = renderForm({ employeeId: arjun.id, actionType: 'resignation' });
    expect(html).toContain('Resignation Date');
    expect(html).toContain('Last Working Date');
    expect(html).toContain('The separation becomes effective on this date.');
    expect(html).not.toContain('employee-action-effective-date');

    const termination = renderForm({ employeeId: arjun.id, actionType: 'termination' });
    expect(termination).toContain('Notice Date');
  });

  it('employment status change only offers statuses it may set', () => {
    const html = renderForm({ employeeId: arjun.id, actionType: 'employment_status_change' });
    expect(html).toContain('>Suspended<');
    expect(html).toContain('>Notice Period<');
    expect(html).not.toContain('>Terminated<');
    expect(html).not.toContain('>Resigned<');
  });

  it('client validation requires the action-specific fields and reason', () => {
    expect(validateActionForm(EMPTY_ACTION_FORM)).toMatchObject({
      employeeId: 'Select an employee',
      actionType: 'Select an action type',
    });
    expect(
      validateActionForm({
        ...EMPTY_ACTION_FORM,
        employeeId: kavya.id,
        actionType: 'location_transfer',
      }),
    ).toMatchObject({
      'values.locationId': 'New Location is required',
      effectiveDate: 'Effective date is required',
      reason: 'Reason is required',
    });
    expect(
      validateActionForm({
        ...EMPTY_ACTION_FORM,
        employeeId: kavya.id,
        actionType: 'termination',
        reason: 'x',
        values: { lastWorkingDate: '2026-10-31' },
      }),
    ).toEqual({});
  });
});

describe('Employee action detail', () => {
  const detail: EmployeeActionDetailData = {
    ...departmentChange,
    employee: kavya,
    history: [
      {
        id: 'eah_1',
        event: 'created',
        fromStatus: null,
        toStatus: 'pending',
        notes: null,
        actor: null,
        createdAt: '2026-09-20T10:00:00.000Z',
      },
      {
        id: 'eah_2',
        event: 'applied',
        fromStatus: 'pending',
        toStatus: 'applied',
        notes: null,
        actor: null,
        createdAt: '2026-10-01T09:00:00.000Z',
      },
    ],
  };

  it('shows employee, current → new change, effective date, reason, status, requester, history', () => {
    const html = renderToStaticMarkup(<EmployeeActionDetail action={detail} today="2026-10-02" />);

    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('EMP-0003');
    expect(html).toContain('Current Value');
    expect(html).toContain('New Value');
    expect(html).toContain('>Engineering<');
    expect(html).toContain('>Product<');
    expect(html).toContain('Effective Date');
    expect(html).toContain('Oct 1, 2026');
    expect(html).toContain('Moving to the product team');
    expect(html).toContain('Requested By');
    expect(html).toContain('Not recorded');
    expect(html).toContain('Action created');
    expect(html).toContain('Action applied');
    expect(html).toContain('pending → applied');
  });

  it('explains when a pending action is not yet effective', () => {
    const html = renderToStaticMarkup(<EmployeeActionDetail action={detail} today="2026-09-25" />);
    expect(html).toContain('becomes effective on Oct 1, 2026');
  });
});

describe('Probation & Confirmation view', () => {
  it('lists employees on probation with confirmation due dates and decisions', () => {
    const html = renderToStaticMarkup(
      <ProbationQueue
        status="ready"
        employees={[kavya]}
        onRetry={noop}
        onConfirm={noop}
        onExtend={noop}
        onOpenEmployee={noop}
      />,
    );

    expect(html).toContain('Joining Date');
    expect(html).toContain('Confirmation Due Date');
    expect(html).toContain('Reporting Manager');
    expect(html).toContain('Kavya Iyer');
    expect(html).toContain('Jun 1, 2026');
    expect(html).toContain('Dec 1, 2026');
    expect(html).toContain('Arjun Mehta');
    expect(html).toContain('Probation');
    expect(html).toContain('Confirm');
    expect(html).toContain('Extend');
  });

  it('shows an empty state when no confirmations are due', () => {
    const html = renderToStaticMarkup(
      <ProbationQueue
        status="ready"
        employees={[]}
        onRetry={noop}
        onConfirm={noop}
        onExtend={noop}
        onOpenEmployee={noop}
      />,
    );
    expect(html).toContain('No confirmations due');
  });
});

/** Collects elements from a (hook-free) component's rendered element tree. */
function findElements(node: ReactNode, predicate: (el: ReactElement) => boolean): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<Record<string, unknown>>;
  const nested = Object.values(el.props).flatMap((value) =>
    findElements(value as ReactNode, predicate),
  );
  return [...(predicate(el) ? [el] : []), ...nested];
}

function clickablesWithText(tree: ReactNode, text: string) {
  return findElements(
    tree,
    (el) =>
      typeof (el.props as { onClick?: unknown }).onClick === 'function' &&
      (el.props as { children?: unknown }).children === text,
  ).map((el) => el.props as { onClick: () => void });
}

describe('Employee Administration → Employee Profile integration', () => {
  it('employee name and ID navigate to the canonical profile; the action opens its detail', () => {
    const onOpen = vi.fn();
    const onOpenEmployee = vi.fn();
    const tree = ActionQueue({
      status: 'ready',
      items: [departmentChange],
      onRetry: noop,
      onOpen,
      onOpenEmployee,
    });

    clickablesWithText(tree, 'Kavya Iyer')[0]!.onClick();
    clickablesWithText(tree, 'EMP-0003')[0]!.onClick();
    expect(onOpenEmployee).toHaveBeenCalledTimes(2);
    expect(onOpenEmployee).toHaveBeenCalledWith('emp_demo_003');
    expect(onOpen).not.toHaveBeenCalled();

    clickablesWithText(tree, 'Department Change')[0]!.onClick();
    clickablesWithText(tree, 'View')[0]!.onClick();
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenCalledWith('ea_1');
    expect(onOpenEmployee).toHaveBeenCalledTimes(2);
  });

  it('employee name in the action detail opens the same profile', () => {
    const onOpenEmployee = vi.fn();
    const tree = EmployeeActionDetail({
      action: { ...departmentChange, employee: kavya, history: [] },
      today: '2026-10-02',
      onOpenEmployee,
    });
    clickablesWithText(tree, 'Kavya Iyer')[0]!.onClick();
    expect(onOpenEmployee).toHaveBeenCalledWith('emp_demo_003');
  });

  it('employee name in the probation view opens the same profile', () => {
    const onOpenEmployee = vi.fn();
    const tree = ProbationQueue({
      status: 'ready',
      employees: [kavya],
      onRetry: noop,
      onConfirm: noop,
      onExtend: noop,
      onOpenEmployee,
    });
    clickablesWithText(tree, 'Kavya Iyer')[0]!.onClick();
    expect(onOpenEmployee).toHaveBeenCalledWith('emp_demo_003');
  });
});
