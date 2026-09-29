import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../AuthProvider';
import { LoginPage } from '../LoginPage';

/** Web tests run in Node without a DOM: the page is checked through its server-rendered markup. */
describe('Universal sign-in page (ADR-018)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function render(path = '/login') {
    return renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('starts with the passwordless email step for every user', () => {
    const html = render();
    expect(html).toContain('Sign in to BEZENT');
    expect(html).toContain('type="email"');
    expect(html.toLowerCase()).toContain('autocomplete="email"');
    expect(html).toContain('Send sign-in code');
    expect(html).not.toContain('type="password"');
    expect(html.toLowerCase()).not.toContain('password:');
  });

  it('does not offer any role-specific sign-in', () => {
    const html = render('/login?next=%2Fsuper-admin%2Fdashboard').toLowerCase();
    for (const role of ['super admin login', 'admin sign in', 'employee login']) {
      expect(html).not.toContain(role);
    }
    expect(html).toContain('one sign-in for every bezent workspace');
  });
});
