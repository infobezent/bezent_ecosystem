import { useState } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Badge,
  Card,
  CardTitle,
  Stack,
  Inline,
} from '../../../../design-system';

export interface OnboardingTaskItem {
  id: string;
  taskName: string;
  otherTaskName?: string;
  description: string;
  assignedTo: string;
  otherAssignedTo?: string;
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface AssetItem {
  id: string;
  assetName: string;
  otherAssetName?: string;
  quantity: number | '';
  issueDate: string;
}

const PREDEFINED_TASKS = [
  { value: 'Laptop & Workspace Setup', label: 'Laptop & Workspace Setup' },
  { value: 'ID Badge Creation', label: 'ID Badge Creation' },
  { value: 'Compliance & Policy Signing', label: 'Compliance & Policy Signing' },
  { value: 'Team Introduction & Orientation', label: 'Team Introduction & Orientation' },
  { value: 'Benefits Enrollment', label: 'Benefits Enrollment' },
  { value: 'Bank & Payroll Account Setup', label: 'Bank & Payroll Account Setup' },
  { value: 'Security Awareness Training', label: 'Security Awareness Training' },
  { value: 'other', label: '+ Other / Add New' },
];

const ASSIGNED_TO_OPTIONS = [
  { value: 'Employee', label: 'Employee' },
  { value: 'HR', label: 'HR' },
  { value: 'Manager', label: 'Manager' },
  { value: 'IT', label: 'IT' },
  { value: 'other', label: '+ Other / Add New' },
];

const PREDEFINED_ASSETS = [
  { value: 'Laptop (MacBook / ThinkPad)', label: 'Laptop (MacBook / ThinkPad)' },
  { value: 'Monitor / External Display', label: 'Monitor / External Display' },
  { value: 'Keyboard & Mouse', label: 'Keyboard & Mouse' },
  { value: 'Headset / Headphones', label: 'Headset / Headphones' },
  { value: 'ID Badge & Access Keycard', label: 'ID Badge & Access Keycard' },
  { value: 'Company Mobile Phone', label: 'Company Mobile Phone' },
  { value: 'Security Hardware Token (YubiKey)', label: 'Security Hardware Token (YubiKey)' },
  { value: 'other', label: '+ Other / Add New' },
];

export function OnboardingSection() {
  const [tasks, setTasks] = useState<OnboardingTaskItem[]>([
    {
      id: 'task_1',
      taskName: 'Laptop & Workspace Setup',
      description: 'Configure hardware and set up company email and software access.',
      assignedTo: 'IT',
      dueDate: '',
      status: 'In Progress',
    },
  ]);

  const [assets, setAssets] = useState<AssetItem[]>([
    {
      id: 'asset_1',
      assetName: 'Laptop (MacBook / ThinkPad)',
      quantity: 1,
      issueDate: new Date().toISOString().split('T')[0] || '',
    },
  ]);

  // Automation Rule: Calculate if task is Overdue (Due Date has passed AND Task Status is not Completed)
  const isTaskOverdue = (dueDate: string, status: string): boolean => {
    if (status === 'Completed' || !dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
  };

  // Task Operations
  const addTask = () => {
    setTasks([
      ...tasks,
      {
        id: `task_${Date.now()}`,
        taskName: 'ID Badge Creation',
        description: '',
        assignedTo: 'HR',
        dueDate: '',
        status: 'Not Started',
      },
    ]);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const updateTask = <K extends keyof OnboardingTaskItem>(
    id: string,
    field: K,
    value: OnboardingTaskItem[K],
  ) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  // Asset Operations
  const addAsset = () => {
    setAssets([
      ...assets,
      {
        id: `asset_${Date.now()}`,
        assetName: 'ID Badge & Access Keycard',
        quantity: 1,
        issueDate: new Date().toISOString().split('T')[0] || '',
      },
    ]);
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  const updateAsset = <K extends keyof AssetItem>(id: string, field: K, value: AssetItem[K]) => {
    setAssets(assets.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  return (
    <Stack gap="xl">
      {/* SECTION 1: ONBOARDING TASKS */}
      <FormSection
        title="Onboarding Tasks"
        description="Individual onboarding tasks that need to be completed."
      >
        <Stack gap="md">
          {tasks.map((task, idx) => {
            const overdue = isTaskOverdue(task.dueDate, task.status);
            const statusOptions = [
              { value: 'Not Started', label: 'Not Started' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              ...(overdue ? [{ value: 'Overdue', label: 'Overdue (Auto-Calculated)' }] : []),
            ];

            return (
              <Card key={task.id} variant="flat">
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <CardTitle>Task #{idx + 1}</CardTitle>
                    {tasks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(task.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </Inline>

                  <FormGrid columns={2} layout="horizontal" labelWidth="md">
                    {/* 1. Onboarding Tasks */}
                    <FormField label="Onboarding Tasks" required>
                      <Stack gap="xs">
                        <Select
                          options={PREDEFINED_TASKS}
                          value={task.taskName}
                          onChange={(e) => updateTask(task.id, 'taskName', e.target.value)}
                        />
                        {task.taskName === 'other' && (
                          <Input
                            type="text"
                            placeholder="Enter Onboarding Task..."
                            value={task.otherTaskName || ''}
                            onChange={(e) => updateTask(task.id, 'otherTaskName', e.target.value)}
                          />
                        )}
                      </Stack>
                    </FormField>

                    {/* 3. Assigned To */}
                    <FormField label="Assigned To" required>
                      <Stack gap="xs">
                        <Select
                          options={ASSIGNED_TO_OPTIONS}
                          value={task.assignedTo}
                          onChange={(e) => updateTask(task.id, 'assignedTo', e.target.value)}
                        />
                        {task.assignedTo === 'other' && (
                          <Input
                            type="text"
                            placeholder="Enter Assignment..."
                            value={task.otherAssignedTo || ''}
                            onChange={(e) => updateTask(task.id, 'otherAssignedTo', e.target.value)}
                          />
                        )}
                      </Stack>
                    </FormField>

                    {/* 2. Task Description (Full Width) */}
                    <FormField label="Task Description" span="full">
                      <Textarea
                        placeholder="Enter task details or instructions..."
                        rows={3}
                        value={task.description}
                        onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                      />
                    </FormField>

                    {/* 4. Due Date */}
                    <FormField label="Due Date">
                      <Input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
                      />
                    </FormField>

                    {/* 5. Task Status */}
                    <FormField
                      label="Task Status"
                      required
                      helperText={overdue ? '⚠️ Overdue — Due Date has passed' : undefined}
                    >
                      <Inline gap="sm" align="center">
                        <Select
                          options={statusOptions}
                          value={overdue ? 'Overdue' : task.status}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (
                              val === 'Completed' ||
                              val === 'In Progress' ||
                              val === 'Not Started'
                            ) {
                              updateTask(task.id, 'status', val);
                            }
                          }}
                        />
                        {task.status === 'Completed' && (
                          <Badge variant="success">✓ Completed</Badge>
                        )}
                        {overdue && <Badge variant="danger">⚠️ Overdue</Badge>}
                      </Inline>
                    </FormField>
                  </FormGrid>
                </Stack>
              </Card>
            );
          })}

          <Inline>
            <Button type="button" variant="secondary" onClick={addTask}>
              + Add Task
            </Button>
          </Inline>
        </Stack>
      </FormSection>

      {/* SECTION 2: ASSETS */}
      <FormSection
        title="Assigned Assets"
        description="Assets assigned to the employee during onboarding."
      >
        <Stack gap="md">
          {assets.map((asset, idx) => (
            <Card key={asset.id} variant="flat">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <CardTitle>Asset #{idx + 1}</CardTitle>
                  {assets.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAsset(asset.id)}
                    >
                      Remove
                    </Button>
                  )}
                </Inline>

                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  {/* 1. Assets */}
                  <FormField label="Assets" required>
                    <Stack gap="xs">
                      <Select
                        options={PREDEFINED_ASSETS}
                        value={asset.assetName}
                        onChange={(e) => updateAsset(asset.id, 'assetName', e.target.value)}
                      />
                      {asset.assetName === 'other' && (
                        <Input
                          type="text"
                          placeholder="Enter Asset Name..."
                          value={asset.otherAssetName || ''}
                          onChange={(e) => updateAsset(asset.id, 'otherAssetName', e.target.value)}
                        />
                      )}
                    </Stack>
                  </FormField>

                  {/* 2. Asset Quantity */}
                  <FormField label="Asset Quantity" required>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={asset.quantity}
                      onChange={(e) =>
                        updateAsset(asset.id, 'quantity', Number(e.target.value) || '')
                      }
                    />
                  </FormField>

                  {/* 3. Asset Issue Date */}
                  <FormField label="Asset Issue Date" required>
                    <Input
                      type="date"
                      value={asset.issueDate}
                      onChange={(e) => updateAsset(asset.id, 'issueDate', e.target.value)}
                    />
                  </FormField>
                </FormGrid>
              </Stack>
            </Card>
          ))}

          <Inline>
            <Button type="button" variant="secondary" onClick={addAsset}>
              + Add Asset
            </Button>
          </Inline>
        </Stack>
      </FormSection>
    </Stack>
  );
}
