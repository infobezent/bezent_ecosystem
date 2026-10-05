import {
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../../auth/service/otpAuth.service.js';
import { SESSION_TTL_HOURS } from '../../auth/service/auth.service.js';
import { MODULE_CATALOG } from '../../modules/types/module.types.js';
import type { GovernanceSummary } from '../types/governance.types.js';

export class GovernanceService {
  getSummary(): GovernanceSummary {
    const total = MODULE_CATALOG.length;
    const available = MODULE_CATALOG.filter(
      (m) => m.availability === 'GA' || m.availability === 'Beta',
    ).length;
    const comingSoon = MODULE_CATALOG.filter((m) => m.availability === 'Planned').length;

    return {
      authentication: {
        method: 'email_otp',
        enabled: true,
        otpExpiryMinutes: OTP_TTL_MINUTES,
        maxVerificationAttempts: OTP_MAX_ATTEMPTS,
        resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      },
      session: {
        ttlHours: SESSION_TTL_HOURS,
        platformAuthorization: true,
      },
      isolation: {
        tenantIsolation: true,
        companyScoping: true,
        identitySeparatedFromEmployee: true,
      },
      audit: {
        enabled: true,
        sensitiveMetadataProtection: true,
        scope: 'platform_and_company',
      },
      applications: {
        total,
        available,
        comingSoon,
      },
    };
  }
}

export const governanceService = new GovernanceService();
