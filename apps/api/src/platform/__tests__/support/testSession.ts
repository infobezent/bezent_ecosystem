import { authRepository } from '../../auth/repository/auth.repository.js';
import { authService } from '../../auth/service/auth.service.js';
import type { LoginResult } from '../../auth/types/auth.types.js';

/**
 * TEST FIXTURE ONLY. Opens a session for a seeded test user through the one
 * session system, skipping the email round-trip so suites that test
 * authorization do not depend on OTP delivery. The OTP flow itself is covered
 * end to end in otpAuth.test.ts. Not reachable through any HTTP route.
 */
export async function signInForTest(email: string): Promise<LoginResult> {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new Error(`Test user '${email}' does not exist`);
  }
  return authService.issueSession(user);
}
