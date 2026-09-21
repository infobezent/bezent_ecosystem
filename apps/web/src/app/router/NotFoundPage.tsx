import { Link } from 'react-router-dom';

/** Shown inside the shell for addresses that belong to no application. */
export function NotFoundPage({ homePath }: { homePath: string }) {
  return (
    <div className="dev-placeholder" role="status">
      <h1>Page not available</h1>
      <p>This address does not match any BEZENT application.</p>
      <Link to={homePath}>Go to home</Link>
    </div>
  );
}
