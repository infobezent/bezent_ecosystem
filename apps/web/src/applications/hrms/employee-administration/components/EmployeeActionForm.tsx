import {
  FormField,
  FormGrid,
  FormSection,
  Input,
  SearchInput,
  Select,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import type {
  ActionValueKey,
  EmployeeRecord,
  OrganizationMasters,
} from '../api/employeeAdministrationApi';
import {
  CATEGORY_LABELS,
  EMPLOYMENT_TYPE_OPTIONS,
  STATUS_CHANGE_OPTIONS,
  currentValueLabel,
  getActionDefinition,
  type ActionFieldDefinition,
  type ActionFormErrors,
  type ActionFormState,
  type ActionTypeDefinition,
} from '../model/actionCatalog';

export interface EmployeeActionFormProps {
  form: ActionFormState;
  errors: ActionFormErrors;
  /** Employees available for selection (and as reporting managers). */
  employees: EmployeeRecord[];
  masters: OrganizationMasters | null;
  /** Action types offered in step 2. */
  actionTypes: ActionTypeDefinition[];
  /** Label for the action type selector, e.g. "Decision" in the probation view. */
  actionTypeLabel?: string;
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  onChange: (form: ActionFormState) => void;
}

function placeholder(label: string) {
  return { value: '', label };
}

/**
 * Generic, catalog-driven Employee Action form:
 *   1. Select employee  2. Select action type  3. Action-specific details.
 */
export function EmployeeActionForm({
  form,
  errors,
  employees,
  masters,
  actionTypes,
  actionTypeLabel = 'Action Type',
  employeeSearch,
  onEmployeeSearchChange,
  onChange,
}: EmployeeActionFormProps) {
  const employee = employees.find((candidate) => candidate.id === form.employeeId);
  const definition = getActionDefinition(form.actionType);
  const categories = [...new Set(actionTypes.map((type) => type.category))];

  const setValue = (key: ActionValueKey, value: string) =>
    onChange({ ...form, values: { ...form.values, [key]: value } });

  const optionsFor = (field: ActionFieldDefinition) => {
    switch (field.kind) {
      case 'department':
        return (masters?.departments ?? []).map((d) => ({ value: d.id, label: d.name }));
      case 'designation':
        return (masters?.designations ?? []).map((d) => ({ value: d.id, label: d.name }));
      case 'location':
        return (masters?.locations ?? []).map((l) => ({ value: l.id, label: l.name }));
      case 'employee':
        return employees
          .filter((candidate) => candidate.id !== form.employeeId)
          .map((candidate) => ({
            value: candidate.id,
            label: `${candidate.fullName} (${candidate.employeeNumber})`,
          }));
      case 'employmentType':
        return EMPLOYMENT_TYPE_OPTIONS;
      case 'employmentStatus':
        return STATUS_CHANGE_OPTIONS;
      default:
        return [];
    }
  };

  const renderField = (field: ActionFieldDefinition) => {
    const id = `employee-action-${field.key}`;
    const error = errors[`values.${field.key}`];
    const value = form.values[field.key] ?? '';

    return (
      <FormField
        key={field.key}
        label={field.label}
        htmlFor={id}
        required={field.required}
        helperText={field.helperText}
        error={error}
      >
        {field.kind === 'date' ? (
          <Input
            id={id}
            type="date"
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        ) : (
          <Select
            id={id}
            value={value}
            onChange={(e) => setValue(field.key, e.target.value)}
            options={[
              placeholder(field.required ? `Select ${field.label.toLowerCase()}` : 'No change'),
              ...optionsFor(field),
            ]}
          />
        )}
      </FormField>
    );
  };

  return (
    <Stack gap="lg">
      <FormSection title="1. Select Employee">
        <Stack gap="sm">
          <SearchInput
            placeholder="Search by employee name or ID"
            value={employeeSearch}
            onChange={(e) => onEmployeeSearchChange(e.target.value)}
            onClear={() => onEmployeeSearchChange('')}
            aria-label="Search employees"
          />
          <FormField
            label="Employee"
            htmlFor="employee-action-employee"
            required
            error={errors.employeeId}
          >
            <Select
              id="employee-action-employee"
              value={form.employeeId}
              onChange={(e) => onChange({ ...form, employeeId: e.target.value, values: {} })}
            >
              <option value="">Select an employee</option>
              {employees.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName} ({candidate.employeeNumber})
                </option>
              ))}
            </Select>
          </FormField>
        </Stack>
      </FormSection>

      <FormSection title={`2. Select ${actionTypeLabel}`}>
        <FormField
          label={actionTypeLabel}
          htmlFor="employee-action-type"
          required
          error={errors.actionType}
          helperText={definition?.description}
        >
          <Select
            id="employee-action-type"
            value={form.actionType}
            disabled={!form.employeeId}
            onChange={(e) =>
              onChange({
                ...form,
                actionType: e.target.value as ActionFormState['actionType'],
                values: {},
              })
            }
          >
            <option value="">Select {actionTypeLabel.toLowerCase()}</option>
            {categories.map((category) => (
              <optgroup key={category} label={CATEGORY_LABELS[category]}>
                {actionTypes
                  .filter((type) => type.category === category)
                  .map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
        </FormField>
      </FormSection>

      {employee && definition && (
        <FormSection title={`3. ${definition.label} Details`}>
          <FormGrid columns={2}>
            <FormField label="Employee" htmlFor="employee-action-employee-summary">
              <Input
                id="employee-action-employee-summary"
                value={`${employee.fullName} (${employee.employeeNumber})`}
                readOnly
              />
            </FormField>

            {definition.current.map((current) => (
              <FormField
                key={current.key}
                label={current.label}
                htmlFor={`employee-action-current-${current.key}`}
              >
                <Input
                  id={`employee-action-current-${current.key}`}
                  value={currentValueLabel(employee, current.key)}
                  readOnly
                />
              </FormField>
            ))}

            {definition.fields.map(renderField)}

            {definition.effectiveDate === 'required' && (
              <FormField
                label="Effective Date"
                htmlFor="employee-action-effective-date"
                required
                error={errors.effectiveDate}
              >
                <Input
                  id="employee-action-effective-date"
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => onChange({ ...form, effectiveDate: e.target.value })}
                />
              </FormField>
            )}

            <FormField
              label="Reason"
              htmlFor="employee-action-reason"
              required
              error={errors.reason}
              span="full"
            >
              <Textarea
                id="employee-action-reason"
                rows={3}
                maxLength={1000}
                value={form.reason}
                onChange={(e) => onChange({ ...form, reason: e.target.value })}
              />
            </FormField>
          </FormGrid>
        </FormSection>
      )}
    </Stack>
  );
}
