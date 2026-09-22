import { useState } from 'react';
import './OnboardingSection.css';

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
    <div className="onboarding-section">
      {/* SECTION 1: ONBOARDING TASKS */}
      <div className="onboarding-section__group">
        <h3 className="onboarding-section__group-title">ONBOARDING TASKS</h3>
        <p className="onboarding-section__group-subtitle">
          Individual onboarding tasks that need to be completed.
        </p>

        <div className="onboarding-section__cards-list">
          {tasks.map((task, idx) => {
            const overdue = isTaskOverdue(task.dueDate, task.status);
            return (
              <div key={task.id} className="onboarding-section__card">
                <div className="onboarding-section__card-header">
                  <span className="onboarding-section__card-title">Task #{idx + 1}</span>
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      className="onboarding-section__remove-btn"
                      onClick={() => removeTask(task.id)}
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="onboarding-section__form-grid-2">
                  {/* 1. Onboarding Tasks */}
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">
                      Onboarding Tasks <span className="employee-registration__required">*</span>
                    </label>
                    <div className="employee-registration__select-wrapper">
                      <select
                        className="employee-registration__select"
                        value={task.taskName}
                        onChange={(e) => updateTask(task.id, 'taskName', e.target.value)}
                      >
                        {PREDEFINED_TASKS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span className="employee-registration__select-icon">▼</span>
                    </div>
                    {task.taskName === 'other' && (
                      <div className="employee-registration__other-container">
                        <input
                          type="text"
                          className="employee-registration__input"
                          placeholder="Enter Onboarding Task..."
                          value={task.otherTaskName || ''}
                          onChange={(e) => updateTask(task.id, 'otherTaskName', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Assigned To */}
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">
                      Assigned To <span className="employee-registration__required">*</span>
                    </label>
                    <div className="employee-registration__select-wrapper">
                      <select
                        className="employee-registration__select"
                        value={task.assignedTo}
                        onChange={(e) => updateTask(task.id, 'assignedTo', e.target.value)}
                      >
                        {ASSIGNED_TO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span className="employee-registration__select-icon">▼</span>
                    </div>
                    {task.assignedTo === 'other' && (
                      <div className="employee-registration__other-container">
                        <input
                          type="text"
                          className="employee-registration__input"
                          placeholder="Enter Assignment..."
                          value={task.otherAssignedTo || ''}
                          onChange={(e) => updateTask(task.id, 'otherAssignedTo', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Task Description (Full Width) */}
                  <div className="employee-registration__field onboarding-section__field--full">
                    <label className="employee-registration__label">Task Description</label>
                    <textarea
                      className="onboarding-section__textarea"
                      placeholder="Enter task details or instructions..."
                      rows={3}
                      value={task.description}
                      onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                    />
                  </div>

                  {/* 4. Due Date */}
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">Due Date</label>
                    <input
                      type="date"
                      className="employee-registration__input"
                      value={task.dueDate}
                      onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
                    />
                  </div>

                  {/* 5. Task Status */}
                  <div className="employee-registration__field">
                    <label className="employee-registration__label">
                      Task Status <span className="employee-registration__required">*</span>
                    </label>
                    <div className="employee-registration__select-wrapper">
                      <select
                        className={`employee-registration__select ${
                          overdue ? 'onboarding-section__select--overdue' : ''
                        }`}
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
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue" disabled={!overdue}>
                          Overdue (Auto-Calculated)
                        </option>
                      </select>
                      <span className="employee-registration__select-icon">▼</span>
                    </div>
                    {overdue && (
                      <span className="onboarding-section__status-badge onboarding-section__status-badge--overdue">
                        ⚠️ Overdue — Due Date has passed
                      </span>
                    )}
                    {task.status === 'Completed' && (
                      <span className="onboarding-section__status-badge onboarding-section__status-badge--completed">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button type="button" className="onboarding-section__add-btn" onClick={addTask}>
            + Add Task
          </button>
        </div>
      </div>

      {/* SECTION 2: ASSETS */}
      <div className="onboarding-section__group">
        <h3 className="onboarding-section__group-title">ASSETS</h3>
        <p className="onboarding-section__group-subtitle">
          Assets assigned to the employee during onboarding.
        </p>

        <div className="onboarding-section__cards-list">
          {assets.map((asset, idx) => (
            <div key={asset.id} className="onboarding-section__card">
              <div className="onboarding-section__card-header">
                <span className="onboarding-section__card-title">Asset #{idx + 1}</span>
                {assets.length > 1 && (
                  <button
                    type="button"
                    className="onboarding-section__remove-btn"
                    onClick={() => removeAsset(asset.id)}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              <div className="onboarding-section__form-grid-3">
                {/* 1. Assets */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Assets <span className="employee-registration__required">*</span>
                  </label>
                  <div className="employee-registration__select-wrapper">
                    <select
                      className="employee-registration__select"
                      value={asset.assetName}
                      onChange={(e) => updateAsset(asset.id, 'assetName', e.target.value)}
                    >
                      {PREDEFINED_ASSETS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="employee-registration__select-icon">▼</span>
                  </div>
                  {asset.assetName === 'other' && (
                    <div className="employee-registration__other-container">
                      <input
                        type="text"
                        className="employee-registration__input"
                        placeholder="Enter Asset Name..."
                        value={asset.otherAssetName || ''}
                        onChange={(e) => updateAsset(asset.id, 'otherAssetName', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Asset Quantity */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Asset Quantity <span className="employee-registration__required">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="employee-registration__input"
                    placeholder="1"
                    value={asset.quantity}
                    onChange={(e) =>
                      updateAsset(asset.id, 'quantity', Number(e.target.value) || '')
                    }
                  />
                </div>

                {/* 3. Asset Issue Date */}
                <div className="employee-registration__field">
                  <label className="employee-registration__label">
                    Asset Issue Date <span className="employee-registration__required">*</span>
                  </label>
                  <input
                    type="date"
                    className="employee-registration__input"
                    value={asset.issueDate}
                    onChange={(e) => updateAsset(asset.id, 'issueDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="onboarding-section__add-btn" onClick={addAsset}>
            + Add Asset
          </button>
        </div>
      </div>
    </div>
  );
}
