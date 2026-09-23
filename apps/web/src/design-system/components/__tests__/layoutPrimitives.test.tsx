import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Stack } from '../Stack';
import { Inline } from '../Inline';
import { Grid } from '../Grid';
import { PageHeader } from '../PageHeader';
import { FormGrid, FieldGroup } from '../FormGrid';
import { Section } from '../Section';
import { Divider } from '../Divider';
import { Toolbar } from '../Toolbar';
import { Actions } from '../Actions';
import { FormSection } from '../FormSection';

describe('Design System Layout Primitives', () => {
  it('Stack renders children with gap and align classes', () => {
    const html = renderToStaticMarkup(
      <Stack gap="lg" align="center" justify="between">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>,
    );

    expect(html).toContain('bezent-stack');
    expect(html).toContain('bezent-stack--gap-lg');
    expect(html).toContain('bezent-stack--align-center');
    expect(html).toContain('bezent-stack--justify-between');
    expect(html).toContain('Item 1');
  });

  it('Inline renders children with nowrap/wrap and alignment classes', () => {
    const html = renderToStaticMarkup(
      <Inline gap="md" align="center" wrap>
        <span>A</span>
        <span>B</span>
      </Inline>,
    );

    expect(html).toContain('bezent-inline');
    expect(html).toContain('bezent-inline--wrap');
    expect(html).toContain('bezent-inline--gap-md');
    expect(html).toContain('A');
  });

  it('Grid renders columns and gap classes', () => {
    const html = renderToStaticMarkup(
      <Grid columns={3} gap="lg">
        <div>Col 1</div>
        <div>Col 2</div>
        <div>Col 3</div>
      </Grid>,
    );

    expect(html).toContain('bezent-grid');
    expect(html).toContain('bezent-grid--cols-3');
    expect(html).toContain('bezent-grid--gap-lg');
  });

  it('PageHeader renders title, eyebrow, subtitle, and action slots', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Test Page"
        eyebrow="HRMS"
        subtitle="Page description"
        actions={<button type="button">Action</button>}
      />,
    );

    expect(html).toContain('bezent-page-header');
    expect(html).toContain('Test Page');
    expect(html).toContain('HRMS');
    expect(html).toContain('Page description');
    expect(html).toContain('Action');
  });

  it('FormGrid and FieldGroup render accessible form layout', () => {
    const html = renderToStaticMarkup(
      <FormGrid columns={2}>
        <FieldGroup label="Full Name" required htmlFor="name-input" error="Name is required">
          <input id="name-input" type="text" />
        </FieldGroup>
      </FormGrid>,
    );

    expect(html).toContain('bezent-form-grid');
    expect(html).toContain('bezent-form-grid--cols-2');
    expect(html).toContain('bezent-field-group');
    expect(html).toContain('Full Name');
    expect(html).toContain('*');
    expect(html).toContain('Name is required');
  });

  it('FormGrid supports opt-in horizontal layout with semantic labelWidth variants', () => {
    const html = renderToStaticMarkup(
      <FormGrid columns={2} layout="horizontal" labelWidth="lg">
        <FieldGroup label="Reporting Manager" htmlFor="mgr-input">
          <input id="mgr-input" type="text" />
        </FieldGroup>
        <FieldGroup label="Work Notes" span={2}>
          <textarea />
        </FieldGroup>
      </FormGrid>,
    );

    expect(html).toContain('bezent-form-grid--layout-horizontal');
    expect(html).toContain('bezent-form-grid--label-width-lg');
    expect(html).toContain('bezent-field-group--horizontal');
    expect(html).toContain('bezent-field-group--label-width-lg');
    expect(html).toContain('bezent-field-group--span-2');
  });

  it('FieldGroup allows overriding layout orientation and labelWidth explicitly', () => {
    const html = renderToStaticMarkup(
      <FormGrid columns={2} layout="horizontal" labelWidth="md">
        <FieldGroup label="Custom Width Field" labelWidth="sm">
          <input type="text" />
        </FieldGroup>
        <FieldGroup label="Vertical Field in Horizontal Grid" orientation="vertical">
          <textarea />
        </FieldGroup>
      </FormGrid>,
    );

    expect(html).toContain('bezent-field-group--label-width-sm');
    expect(html).toContain('bezent-field-group--vertical');
  });

  it('Section renders card container with title and action header', () => {
    const html = renderToStaticMarkup(
      <Section title="Section Title" subtitle="Section Subtitle">
        <div>Content</div>
      </Section>,
    );

    expect(html).toContain('bezent-section');
    expect(html).toContain('Section Title');
    expect(html).toContain('Section Subtitle');
    expect(html).toContain('Content');
  });

  it('Divider renders semantic separator', () => {
    const html = renderToStaticMarkup(<Divider orientation="horizontal" spacing="md" />);

    expect(html).toContain('bezent-divider');
    expect(html).toContain('bezent-divider--horizontal');
    expect(html).toContain('bezent-divider--spacing-md');
  });

  it('Toolbar renders left and right slots', () => {
    const html = renderToStaticMarkup(
      <Toolbar left={<span>Left</span>} right={<button type="button">Right</button>} />,
    );

    expect(html).toContain('bezent-toolbar');
    expect(html).toContain('bezent-toolbar__left');
    expect(html).toContain('bezent-toolbar__right');
    expect(html).toContain('Left');
    expect(html).toContain('Right');
  });

  it('Actions renders align and gap classes', () => {
    const html = renderToStaticMarkup(
      <Actions align="between" gap="sm">
        <button type="button">1</button>
        <button type="button">2</button>
      </Actions>,
    );

    expect(html).toContain('bezent-actions');
    expect(html).toContain('bezent-actions--align-between');
    expect(html).toContain('bezent-actions--gap-sm');
  });

  it('FormSection renders title, description, actions, and body', () => {
    const html = renderToStaticMarkup(
      <FormSection
        title="Personal Details"
        description="Enter legal details"
        actions={<button type="button">Save</button>}
      >
        <div>Form Fields</div>
      </FormSection>,
    );

    expect(html).toContain('bezent-form-section');
    expect(html).toContain('Personal Details');
    expect(html).toContain('Enter legal details');
    expect(html).toContain('Save');
    expect(html).toContain('Form Fields');
  });
});
