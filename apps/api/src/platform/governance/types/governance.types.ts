export interface GovernanceSummary {
  authentication: {
    method: 'email_otp';
    enabled: boolean;
    otpExpiryMinutes: number;
    maxVerificationAttempts: number;
    resendCooldownSeconds: number;
  };
  session: {
    ttlHours: number;
    platformAuthorization: boolean;
  };
  isolation: {
    tenantIsolation: boolean;
    companyScoping: boolean;
    identitySeparatedFromEmployee: boolean;
  };
  audit: {
    enabled: boolean;
    sensitiveMetadataProtection: boolean;
    scope: string;
  };
  applications: {
    total: number;
    available: number;
    comingSoon: number;
  };
}
