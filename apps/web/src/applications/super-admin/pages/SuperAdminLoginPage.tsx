import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Stack,
  Inline,
  Button,
  Input,
  Alert,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';

export function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useSuperAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ email: email.trim(), password });
      navigate('/super-admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bezent-login-container">
      <Card>
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <Stack gap="xs" align="center">
              <BezentIcon name="dashboard" size={32} color="currentColor" />
              <h2>BEZENT Super Admin</h2>
              <span className="bezent-caption">
                Platform Administration & Multi-Tenant Governance
              </span>
            </Stack>

            {error && (
              <Alert variant="error" title="Authentication Failed">
                {error}
              </Alert>
            )}

            <Stack gap="md">
              <Input
                label="Administrator Email"
                type="email"
                placeholder="superadmin@bezent.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                leftIcon={<BezentIcon name="check" size={16} color="currentColor" />}
              >
                {loading ? 'Authenticating...' : 'Sign in to Platform'}
              </Button>
            </Stack>

            <Inline justify="center">
              <span className="bezent-caption">
                Authorized Personnel Only • Audit Logged
              </span>
            </Inline>
          </Stack>
        </form>
      </Card>
    </div>
  );
}
