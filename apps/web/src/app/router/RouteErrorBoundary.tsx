import { useRouteError, useNavigate } from 'react-router-dom';
import { Page, Card, EmptyState } from '../../design-system/components';

/**
 * RouteErrorBoundary — Global BEZENT route error boundary.
 * Renders a clean, branded error state without leaking stack traces,
 * source paths, or implementation details to users.
 * Diagnostic details are logged exclusively to console for development.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  // Keep developer diagnostics in console only
  if (typeof console !== 'undefined' && console.error) {
    console.error('[BEZENT RouteErrorBoundary] Unhandled application route error:', error);
  }

  const handleTryAgain = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Page>
      <Card>
        <EmptyState
          title="Something went wrong"
          description="We couldn't load this page. Please try again or return to your previous view."
          primaryAction={{
            label: 'Try Again',
            onClick: handleTryAgain,
          }}
          secondaryAction={{
            label: 'Go Back',
            onClick: handleGoBack,
          }}
        />
      </Card>
    </Page>
  );
}

export default RouteErrorBoundary;
