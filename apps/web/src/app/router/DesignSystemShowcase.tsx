/**
 * DesignSystemShowcase — living documentation for every BEZENT Design System component.
 *
 * Available at: /dev/design-system  (DEV builds only — excluded from production)
 *
 * Governance reminder (AGENTS.md, Article 7-10):
 *   1. Search this page before building any UI.
 *   2. If a component exists, USE IT.
 *   3. If a variant is needed, ADD IT to the global component.
 *   4. If functionality is genuinely new, create it here first.
 */

import { useState, type ReactNode } from 'react';
import {
  Button,
  IconButton,
  Alert,
  Badge,
  Avatar,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardDescription,
  Divider,
  EmptyState,
  Input,
  Textarea,
  SearchInput,
  Select,
  Switch,
  Checkbox,
  FormField,
  Label,
  Spinner,
  LoadingState,
  Modal,
  Stack,
  Inline,
  Grid,
  FormGrid,
  Section,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Tooltip,
  Toolbar,
  Actions,
  Page,
  PageHeader,
} from '../../design-system/components';
import { BezentIcon } from '../../design-system/icons';
import './DesignSystemShowcase.css';

/* ─── Demo Data ─────────────────────────────────────────────────────────────── */
const TABLE_ROWS = [
  { name: 'Alice Chen', role: 'Engineer', status: 'active' as const, dept: 'Engineering' },
  { name: 'Bob Patel', role: 'Designer', status: 'pending' as const, dept: 'Design' },
  { name: 'Carol Smith', role: 'Manager', status: 'inactive' as const, dept: 'HR' },
];

const SHOWCASE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'history', label: 'History' },
  { id: 'disabled', label: 'Disabled', disabled: true },
];

const SECTIONS = [
  'Actions',
  'Forms',
  'Controls',
  'Feedback',
  'Data',
  'Overlay',
  'Layout',
  'Display',
  'Governance',
] as const;

type Section = (typeof SECTIONS)[number];

/* ─── Showcase Shell ─────────────────────────────────────────────────────────── */
export function DesignSystemShowcase() {
  const [activeSection, setActiveSection] = useState<Section>('Actions');
  const [modalOpen, setModalOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Page>
      <PageHeader
        title="BEZENT Design System"
        subtitle="Living documentation — every component, every variant, every state."
      />

      {/* Section nav */}
      <nav className="bds-showcase__nav" aria-label="Design system sections">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`bds-showcase__nav-btn ${activeSection === s ? 'is-active' : ''}`}
            onClick={() => setActiveSection(s)}
          >
            {s}
          </button>
        ))}
      </nav>

      <div className="bds-showcase__content">
        {/* ── ACTIONS ─────────────────────────────────────────────────── */}
        {activeSection === 'Actions' && (
          <>
            <ShowcaseBlock title="Button — Variants">
              <Inline gap="sm" wrap>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="text">Text</Button>
                <Button variant="danger">Danger</Button>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="Button — Sizes">
              <Inline gap="sm" align="center">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="Button — States">
              <Inline gap="sm">
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="primary" loading>
                  Loading
                </Button>
                <Button variant="primary" leftIcon={<BezentIcon name="add" size={16} />}>
                  With Icon
                </Button>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="IconButton">
              <Inline gap="sm">
                <IconButton label="Add">
                  <BezentIcon name="add" size={18} />
                </IconButton>
                <IconButton label="Settings" variant="ghost">
                  <BezentIcon name="settings" size={18} />
                </IconButton>
                <IconButton label="Delete" variant="solid">
                  <BezentIcon name="delete" size={18} />
                </IconButton>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="Toolbar + Actions">
              <Toolbar
                left={<SearchInput placeholder="Search…" />}
                right={
                  <Actions>
                    <Button variant="outline" size="sm">
                      Export
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<BezentIcon name="add" size={14} />}
                    >
                      New Record
                    </Button>
                  </Actions>
                }
              />
            </ShowcaseBlock>
          </>
        )}

        {/* ── FORMS ──────────────────────────────────────────────────── */}
        {activeSection === 'Forms' && (
          <>
            <ShowcaseBlock title="Label">
              <Inline gap="md" align="center">
                <Label htmlFor="demo-lbl">Standard Label</Label>
                <Label htmlFor="demo-lbl-req" required>
                  Required Label
                </Label>
                <Label htmlFor="demo-lbl-dis" disabled>
                  Disabled Label
                </Label>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="FormField — Complete Pattern">
              <Stack gap="md" className="bds-form-col">
                <FormField
                  label="Full Name"
                  htmlFor="name-demo"
                  required
                  helperText="Enter as shown on official ID."
                >
                  <Input
                    id="name-demo"
                    placeholder="e.g. Jane Doe"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                  />
                </FormField>

                <FormField
                  label="Work Email"
                  htmlFor="email-demo"
                  required
                  helperText="We'll never share your email."
                >
                  <Input id="email-demo" type="email" placeholder="you@example.com" />
                </FormField>

                <FormField
                  label="Password"
                  htmlFor="pw-demo"
                  error="Password must be at least 8 characters."
                >
                  <Input
                    id="pw-demo"
                    type="password"
                    placeholder="••••••••"
                    error="Password must be at least 8 characters."
                  />
                </FormField>

                <FormField label="Notes" htmlFor="notes-demo">
                  <Textarea id="notes-demo" placeholder="Add any notes…" rows={3} />
                </FormField>
              </Stack>
            </ShowcaseBlock>

            <ShowcaseBlock title="Input — Variants">
              <Stack gap="sm" className="bds-form-col">
                <Input placeholder="Default input" />
                <Input
                  placeholder="With leading icon"
                  leftIcon={<BezentIcon name="search" size={16} />}
                />
                <Input placeholder="Disabled" disabled />
                <Input placeholder="Error state" error="Field has an error" />
              </Stack>
            </ShowcaseBlock>

            <ShowcaseBlock title="SearchInput">
              <div className="bds-form-col">
                <SearchInput placeholder="Search employees…" />
              </div>
            </ShowcaseBlock>

            <ShowcaseBlock title="Select">
              <div className="bds-form-col">
                <Select>
                  <option value="">Select department…</option>
                  <option value="eng">Engineering</option>
                  <option value="design">Design</option>
                  <option value="hr">HR</option>
                </Select>
              </div>
            </ShowcaseBlock>

            <ShowcaseBlock title="Textarea">
              <div className="bds-form-col">
                <Textarea placeholder="Enter description…" rows={4} />
              </div>
            </ShowcaseBlock>
          </>
        )}

        {/* ── CONTROLS ───────────────────────────────────────────────── */}
        {activeSection === 'Controls' && (
          <>
            <ShowcaseBlock title="Switch">
              <Stack gap="sm">
                <Switch
                  id="sw-demo"
                  checked={switchOn}
                  onChange={(e) => setSwitchOn(e.target.checked)}
                  label="Enable notifications"
                />
                <Switch id="sw-disabled" checked disabled label="Disabled switch" />
              </Stack>
            </ShowcaseBlock>

            <ShowcaseBlock title="Checkbox">
              <Stack gap="sm">
                <Checkbox
                  id="cb-demo"
                  label="I agree to the terms and conditions"
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                />
                <Checkbox id="cb-indeterminate" label="Indeterminate state" indeterminate />
                <Checkbox id="cb-disabled" label="Disabled checkbox" disabled />
                <Checkbox id="cb-sm" label="Small size" size="sm" />
              </Stack>
            </ShowcaseBlock>

            <ShowcaseBlock title="Tabs">
              <Tabs items={SHOWCASE_TABS} activeId={activeTab} onChange={setActiveTab} />
            </ShowcaseBlock>
          </>
        )}

        {/* ── FEEDBACK ───────────────────────────────────────────────── */}
        {activeSection === 'Feedback' && (
          <>
            <ShowcaseBlock title="Alert">
              <Stack gap="sm">
                <Alert variant="info" title="Info" onDismiss={() => {}}>
                  This is an informational message.
                </Alert>
                <Alert variant="success" title="Success" onDismiss={() => {}}>
                  Changes saved successfully.
                </Alert>
                <Alert variant="warning" title="Warning">
                  Your session will expire in 5 minutes.
                </Alert>
                <Alert variant="danger" title="Error">
                  Failed to load employee record.
                </Alert>
              </Stack>
            </ShowcaseBlock>

            <ShowcaseBlock title="Badge — Status">
              <Inline gap="sm" wrap>
                <Badge variant="neutral">Draft</Badge>
                <Badge variant="info">In Review</Badge>
                <Badge variant="success">Completed</Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="danger">Rejected</Badge>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="Spinner — Sizes">
              <Inline gap="lg" align="center">
                <Spinner size="xs" />
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <Spinner size="xl" />
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="LoadingState">
              <LoadingState label="Loading employees…" minHeight="sm" />
            </ShowcaseBlock>

            <ShowcaseBlock title="Tooltip">
              <Inline gap="md" align="center">
                <IconButton label="IconButton has built-in tooltip (Hover me)">
                  <BezentIcon name="info" size={18} />
                </IconButton>
                <Tooltip label="Direct Tooltip primitive preview" direction="down" />
              </Inline>
            </ShowcaseBlock>
          </>
        )}

        {/* ── DATA ───────────────────────────────────────────────────── */}
        {activeSection === 'Data' && (
          <>
            <ShowcaseBlock title="Table">
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Department</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {TABLE_ROWS.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <Avatar initials={row.name.slice(0, 2)} alt={row.name} size="sm" />
                          <span>{row.name}</span>
                        </Inline>
                      </TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>{row.dept}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === 'active'
                              ? 'success'
                              : row.status === 'pending'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ShowcaseBlock>

            <ShowcaseBlock title="EmptyState — Default">
              <EmptyState
                title="No Records Found"
                description="Get started by creating your first record."
                primaryAction={{ label: 'Create Record', onClick: () => {} }}
              />
            </ShowcaseBlock>

            <ShowcaseBlock title="EmptyState — Variant (Onboarding)">
              <EmptyState
                variant="onboarding"
                title="No New Hires"
                description="Begin onboarding by adding your first new hire."
                primaryAction={{ label: 'Add New Hire', onClick: () => {} }}
              />
            </ShowcaseBlock>
          </>
        )}

        {/* ── OVERLAY ────────────────────────────────────────────────── */}
        {activeSection === 'Overlay' && (
          <>
            <ShowcaseBlock title="Modal">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Open Modal
              </Button>
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Confirm Action"
                footer={
                  <Actions>
                    <Button variant="secondary" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={() => setModalOpen(false)}>
                      Confirm
                    </Button>
                  </Actions>
                }
              >
                <p>Are you sure you want to perform this action? This cannot be undone.</p>
              </Modal>
            </ShowcaseBlock>
          </>
        )}

        {/* ── LAYOUT ─────────────────────────────────────────────────── */}
        {activeSection === 'Layout' && (
          <>
            <ShowcaseBlock title="Stack (vertical)">
              <Stack gap="sm" className="bds-form-col">
                <div className="bds-demo-box">Item 1</div>
                <div className="bds-demo-box">Item 2</div>
                <div className="bds-demo-box">Item 3</div>
              </Stack>
            </ShowcaseBlock>

            <ShowcaseBlock title="Inline (horizontal)">
              <Inline gap="sm">
                <div className="bds-demo-box">A</div>
                <div className="bds-demo-box">B</div>
                <div className="bds-demo-box">C</div>
              </Inline>
            </ShowcaseBlock>

            <ShowcaseBlock title="Grid — 3 columns">
              <Grid columns={3} gap="sm">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bds-demo-box">
                    Cell {n}
                  </div>
                ))}
              </Grid>
            </ShowcaseBlock>

            <ShowcaseBlock title="FormGrid">
              <FormGrid columns={2}>
                <FormField label="First Name" htmlFor="fg-fn" required>
                  <Input id="fg-fn" placeholder="First name" />
                </FormField>
                <FormField label="Last Name" htmlFor="fg-ln" required>
                  <Input id="fg-ln" placeholder="Last name" />
                </FormField>
                <FormField label="Email" htmlFor="fg-em">
                  <Input id="fg-em" type="email" placeholder="Email" />
                </FormField>
                <FormField label="Phone" htmlFor="fg-ph">
                  <Input id="fg-ph" type="tel" placeholder="Phone" />
                </FormField>
              </FormGrid>
            </ShowcaseBlock>

            <ShowcaseBlock title="FormGrid (Horizontal Enterprise Layout)">
              <FormGrid columns={2} layout="horizontal" labelWidth="md">
                <FormField label="Short Label" htmlFor="hfg-short">
                  <Input id="hfg-short" placeholder="Aligned input" />
                </FormField>
                <FormField label="Employment Type" htmlFor="hfg-type" required>
                  <Input id="hfg-type" placeholder="Aligned input" />
                </FormField>
                <FormField label="Reporting Manager" htmlFor="hfg-manager" required>
                  <Input id="hfg-manager" placeholder="Aligned input" />
                </FormField>
                <FormField label="Confirmed Date of Joining" htmlFor="hfg-date">
                  <Input id="hfg-date" placeholder="Aligned input" />
                </FormField>
              </FormGrid>
            </ShowcaseBlock>
            <ShowcaseBlock title="Card">
              <Card className="bds-card-demo">
                <CardHeader>
                  <CardTitle>Card Title</CardTitle>
                  <CardDescription>Supporting description text</CardDescription>
                </CardHeader>
                <CardBody>
                  <p>Card body content goes here. Use Card for contained, elevated surfaces.</p>
                </CardBody>
              </Card>
            </ShowcaseBlock>

            <ShowcaseBlock title="Divider">
              <Stack gap="sm">
                <p>Above divider</p>
                <Divider />
                <p>Below divider</p>
              </Stack>
            </ShowcaseBlock>
          </>
        )}

        {/* ── DISPLAY ────────────────────────────────────────────────── */}
        {activeSection === 'Display' && (
          <>
            <ShowcaseBlock title="Avatar">
              <Inline gap="sm" align="center">
                <Avatar initials="AC" alt="Alice Chen" size="sm" />
                <Avatar initials="BP" alt="Bob Patel" size="md" />
                <Avatar initials="DK" alt="David Kim" size="lg" />
              </Inline>
            </ShowcaseBlock>
          </>
        )}

        {/* ── GOVERNANCE ─────────────────────────────────────────────── */}
        {activeSection === 'Governance' && (
          <Section>
            <Stack gap="lg">
              <Alert variant="info" title="BEZENT UI Governance Rule">
                Before creating ANY reusable UI, check this page first.
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>How to use the Design System</CardTitle>
                </CardHeader>
                <CardBody>
                  <Stack gap="md">
                    <div>
                      <h4>✅ DO</h4>
                      <ul>
                        <li>
                          Import from <code>@design-system</code> or{' '}
                          <code>design-system/components</code>
                        </li>
                        <li>
                          Use <code>{'<Button>'}</code>, <code>{'<Input>'}</code>,{' '}
                          <code>{'<Modal>'}</code>, <code>{'<Table>'}</code> etc.
                        </li>
                        <li>
                          Add a <code>variant</code> or <code>size</code> prop when a new look is
                          needed
                        </li>
                        <li>
                          Create new components here first, then export from <code>index.ts</code>
                        </li>
                      </ul>
                    </div>
                    <Divider />
                    <div>
                      <h4>❌ DON&apos;T</h4>
                      <ul>
                        <li>
                          Create <code>CustomButton.tsx</code>, <code>CustomInput.tsx</code> inside
                          a business module
                        </li>
                        <li>
                          Use raw <code>{'<button>'}</code>, <code>{'<input>'}</code>,{' '}
                          <code>{'<select>'}</code>, <code>{'<table>'}</code> in application code
                        </li>
                        <li>
                          Add <code>.css</code> files inside <code>applications/</code>
                        </li>
                        <li>
                          Write <code>style={'{{ }}'}</code> inline styles
                        </li>
                      </ul>
                    </div>
                  </Stack>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Import Paths</CardTitle>
                </CardHeader>
                <CardBody>
                  <pre className="bds-code">{`// Preferred — single import surface
import { Button, Input, FormField } from '@design-system';

// Also valid — barrel import
import { Button } from '../../../../design-system/components';

// Icons
import { BezentIcon } from '../../../../design-system/icons';`}</pre>
                </CardBody>
              </Card>
            </Stack>
          </Section>
        )}
      </div>
    </Page>
  );
}

/* ─── Helper Component ───────────────────────────────────────────────────── */
function ShowcaseBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bds-showcase__block">
      <h3 className="bds-showcase__block-title">{title}</h3>
      <div className="bds-showcase__block-body">{children}</div>
    </section>
  );
}
export default DesignSystemShowcase;
