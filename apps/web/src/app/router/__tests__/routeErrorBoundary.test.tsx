import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RouteErrorBoundary } from '../RouteErrorBoundary';

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useRouteError: vi.fn(() => new Error('Simulated runtime exception at TenantsPage.tsx:153:22 TypeError: Cannot read properties of undefined (reading length)')),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe('BEZENT RouteErrorBoundary', () => {
  it('renders a friendly, branded error screen without exposing stack traces or implementation details', () => {
    const html = renderToStaticMarkup(<RouteErrorBoundary />);

    // Renders BEZENT design system empty state
    expect(html).toContain('Something went wrong');
    expect(html).toContain('couldn&#x27;t load this page');
    expect(html).toContain('Try Again');
    expect(html).toContain('Go Back');

    // Conceals sensitive stack trace and source details from users
    expect(html).not.toContain('Cannot read properties of undefined');
    expect(html).not.toContain('TenantsPage.tsx:153:22');
    expect(html).not.toContain('Unexpected Application Error!');
    expect(html).not.toContain('localhost:5173');
  });
});
