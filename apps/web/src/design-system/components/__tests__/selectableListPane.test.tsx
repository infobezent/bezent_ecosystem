import { describe, it, expect, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SelectableList, SelectableListItem } from '../SelectableList';
import { Pane } from '../Pane';
import { Badge } from '../Badge';

function list(selectedId: string | null, onSelect = vi.fn()) {
  return (
    <SelectableList aria-label="Colours" selectedId={selectedId} onSelect={onSelect}>
      <SelectableListItem id="red" description="Warm">
        Red
      </SelectableListItem>
      <SelectableListItem id="green" disabled>
        Green
      </SelectableListItem>
      <SelectableListItem id="blue" trailing={<Badge variant="info">New</Badge>}>
        Blue
      </SelectableListItem>
    </SelectableList>
  );
}

/** The opening tag of the option with `data-item-id`. */
function optionTag(html: string, id: string): string {
  const tag = (html.match(/<div role="option"[^>]*>/g) ?? []).find((t) =>
    t.includes(`data-item-id="${id}"`),
  );
  expect(tag, id).toBeDefined();
  return tag!;
}

/** Finds the listbox element (with its onKeyDown) in the SelectableList element tree. */
function listbox(tree: ReactNode): ReactElement<{ onKeyDown: (e: unknown) => void }> {
  let found: ReactElement | undefined;
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!isValidElement(node)) return;
    const el = node as ReactElement<Record<string, unknown>>;
    if (el.props.role === 'listbox') found = el;
    walk(el.props.children as ReactNode);
  };
  walk(tree);
  expect(found).toBeDefined();
  return found as ReactElement<{ onKeyDown: (e: unknown) => void }>;
}

/** A synthetic key event from the option `fromId`; `focus` records which option got focus. */
function keyEvent(key: string, fromId: string) {
  const focused: string[] = [];
  const option = (id: string) => ({ dataset: { itemId: id }, focus: () => focused.push(id) });
  return {
    event: {
      key,
      target: { dataset: { itemId: fromId } },
      currentTarget: { querySelectorAll: () => ['red', 'green', 'blue'].map(option) },
      preventDefault: vi.fn(),
    },
    focused,
  };
}

describe('SelectableList', () => {
  it('renders an accessible listbox with options, descriptions and trailing content', () => {
    const html = renderToStaticMarkup(list('red'));
    expect(html).toContain('role="listbox"');
    expect(html).toContain('aria-label="Colours"');
    expect(html.match(/role="option"/g)).toHaveLength(3);
    expect(html).toContain('Warm');
    expect(html).toContain('bezent-selectable-list__trailing');
    expect(html).toContain('New');
  });

  it('marks the selected option and makes it the only tab stop', () => {
    const html = renderToStaticMarkup(list('blue'));
    expect(optionTag(html, 'blue')).toContain('aria-selected="true"');
    expect(optionTag(html, 'blue')).toContain('tabindex="0"');
    expect(optionTag(html, 'blue')).toContain('is-selected');
    expect(optionTag(html, 'red')).toContain('aria-selected="false"');
    expect(optionTag(html, 'red')).toContain('tabindex="-1"');
  });

  it('falls back to the first enabled option as tab stop when nothing is selected', () => {
    const html = renderToStaticMarkup(list(null));
    expect(optionTag(html, 'red')).toContain('tabindex="0"');
  });

  it('marks disabled options and never makes them tabbable', () => {
    const html = renderToStaticMarkup(list('green'));
    const green = optionTag(html, 'green');
    expect(green).toContain('aria-disabled="true"');
    expect(green).toContain('tabindex="-1"');
    expect(green).toContain('is-disabled');
    // A disabled "selected" id does not steal the tab stop.
    expect(optionTag(html, 'red')).toContain('tabindex="0"');
  });

  it('ArrowDown/ArrowUp move selection and focus, skipping disabled options', () => {
    const onSelect = vi.fn();
    const box = listbox(
      SelectableList({
        'aria-label': 'Colours',
        selectedId: 'red',
        onSelect,
        children: list('red').props.children,
      }),
    );

    const down = keyEvent('ArrowDown', 'red');
    box.props.onKeyDown(down.event);
    expect(onSelect).toHaveBeenLastCalledWith('blue');
    expect(down.focused).toEqual(['blue']);
    expect(down.event.preventDefault).toHaveBeenCalled();

    const up = keyEvent('ArrowUp', 'blue');
    box.props.onKeyDown(up.event);
    expect(onSelect).toHaveBeenLastCalledWith('red');
  });

  it('Home/End jump to the first/last enabled option; Enter and Space select', () => {
    const onSelect = vi.fn();
    const box = listbox(
      SelectableList({
        'aria-label': 'Colours',
        selectedId: 'red',
        onSelect,
        children: list('red').props.children,
      }),
    );

    box.props.onKeyDown(keyEvent('End', 'red').event);
    expect(onSelect).toHaveBeenLastCalledWith('blue');
    box.props.onKeyDown(keyEvent('Home', 'blue').event);
    expect(onSelect).toHaveBeenLastCalledWith('red');
    box.props.onKeyDown(keyEvent('Enter', 'blue').event);
    expect(onSelect).toHaveBeenLastCalledWith('blue');
    box.props.onKeyDown(keyEvent(' ', 'red').event);
    expect(onSelect).toHaveBeenLastCalledWith('red');
  });

  it('ignores unrelated keys', () => {
    const onSelect = vi.fn();
    const box = listbox(
      SelectableList({
        'aria-label': 'Colours',
        selectedId: 'red',
        onSelect,
        children: list('red').props.children,
      }),
    );
    const event = keyEvent('a', 'red').event;
    box.props.onKeyDown(event);
    expect(onSelect).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('refuses items outside a list', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderToStaticMarkup(<SelectableListItem id="x">X</SelectableListItem>)).toThrow(
      'SelectableListItem must be used within a SelectableList',
    );
    vi.restoreAllMocks();
  });
});

describe('Pane', () => {
  it('renders a plain region by default', () => {
    const html = renderToStaticMarkup(<Pane>Body</Pane>);
    expect(html).toBe('<div class="bezent-pane">Body</div>');
  });

  it('scrolls independently with a tokenised max height and is keyboard-focusable', () => {
    const html = renderToStaticMarkup(
      <Pane scroll="y" maxHeight="lg" aria-label="Fields">
        Body
      </Pane>,
    );
    expect(html).toContain('bezent-pane--scroll-y');
    expect(html).toContain('bezent-pane--max-lg');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Fields"');
  });

  it('can stay in view with sticky and render as another element', () => {
    const html = renderToStaticMarkup(
      <Pane sticky as="aside">
        Details
      </Pane>,
    );
    expect(html).toContain('<aside');
    expect(html).toContain('bezent-pane--sticky');
    expect(html).not.toContain('tabindex');
  });
});
