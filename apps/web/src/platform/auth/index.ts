/**
 * Platform authentication & access (ADR-017 / ADR-018): the one session,
 * sign-in page and access model shared by every BEZENT workspace.
 */
export {
  AuthContext,
  AuthProvider,
  useAuth,
  useOptionalAuth,
  useAuthorization,
  type AuthContextValue,
  type AuthStatus,
} from './AuthProvider';
export { Can, type CanProps } from './Can';
export { RequirePermission, type RequirePermissionProps } from './RequirePermission';
export { LoginPage } from './LoginPage';
export { RequireAuth } from './RequireAuth';
export { landingPath, safeNextPath } from './landing';
export {
  authApi,
  AuthApiError,
  type AccessOverview,
  type AccessRoleSummary,
  type CompanyAccess,
  type ModuleCode,
  type OtpChallenge,
  type SignInResult,
  type WorkspaceId,
} from './authApi';
export { resolveProfileIdentity, type ResolvedProfileIdentity } from './profileIdentity';
export {
  ACTIVE_COMPANY_KEY,
  SESSION_ENDED_EVENT,
  SESSION_TOKEN_KEY,
  authorizedFetch,
  getActiveCompanyId,
  getSessionToken,
} from './session';
