import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Modal } from '../Modal';

describe('Design System Modal Primitive', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={false} onClose={() => {}}>
        Modal Content
      </Modal>,
    );
    expect(html).toBe('');
  });

  it('renders default size (md) and basic dialog structure when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} title="Dialog Title" description="Dialog Description">
        <p>Modal Body Content</p>
      </Modal>,
    );
    expect(html).toContain('bezent-modal-backdrop');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="bezent-modal-title"');
    expect(html).toContain('bezent-modal--md');
    expect(html).toContain('Dialog Title');
    expect(html).toContain('Dialog Description');
    expect(html).toContain('Modal Body Content');
    expect(html).toContain('bezent-modal__close-btn');
  });

  it('supports all standard size variants (sm, md, lg, xl)', () => {
    const htmlSm = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        Small Content
      </Modal>,
    );
    expect(htmlSm).toContain('bezent-modal--sm');

    const htmlMd = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} size="md">
        Medium Content
      </Modal>,
    );
    expect(htmlMd).toContain('bezent-modal--md');

    const htmlLg = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        Large Content
      </Modal>,
    );
    expect(htmlLg).toContain('bezent-modal--lg');

    const htmlXl = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} size="xl">
        XL Content
      </Modal>,
    );
    expect(htmlXl).toContain('bezent-modal--xl');
  });

  it('supports new generic workspace size variant', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} size="workspace" title="Workspace Overlay">
        <p>Large form body</p>
      </Modal>,
    );
    expect(html).toContain('bezent-modal');
    expect(html).toContain('bezent-modal--workspace');
    expect(html).toContain('Workspace Overlay');
    expect(html).toContain('Large form body');
  });

  it('renders headerBottom when provided and applies with-bottom modifier class', () => {
    const html = renderToStaticMarkup(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Workspace Header"
        headerBottom={<div data-testid="tabs-slot">Navigation Tabs</div>}
      >
        <p>Body Content</p>
      </Modal>,
    );
    expect(html).toContain('bezent-modal__header--with-bottom');
    expect(html).toContain('bezent-modal__header-bottom');
    expect(html).toContain('Navigation Tabs');
    expect(html).toContain('data-testid="tabs-slot"');
  });

  it('does not render headerBottom container when omitted', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} title="Standard Header">
        <p>Body Content</p>
      </Modal>,
    );
    expect(html).not.toContain('bezent-modal__header-bottom');
    expect(html).not.toContain('bezent-modal__header--with-bottom');
  });

  it('renders footer when provided and places it in modal footer container', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} footer={<button type="button">Save Changes</button>}>
        <p>Body</p>
      </Modal>,
    );
    expect(html).toContain('bezent-modal__footer');
    expect(html).toContain('Save Changes');
  });

  it('does not render footer container when omitted', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    );
    expect(html).not.toContain('bezent-modal__footer');
  });

  it('applies custom className alongside modal and size classes', () => {
    const html = renderToStaticMarkup(
      <Modal isOpen={true} onClose={() => {}} size="workspace" className="custom-test-class">
        <p>Content</p>
      </Modal>,
    );
    expect(html).toContain('bezent-modal');
    expect(html).toContain('bezent-modal--workspace');
    expect(html).toContain('custom-test-class');
  });
});
