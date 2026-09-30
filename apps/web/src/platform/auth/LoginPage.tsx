import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Inline, Input, Stack } from '../../design-system/components';
import { BezentIcon } from '../../design-system/icons';
import { authApi, AuthApiError, type OtpChallenge } from './authApi';
import { useAuth } from './AuthProvider';
import { landingPath, safeNextPath } from './landing';
import { LoginBackground } from './LoginBackground';
import './LoginPage.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^\d{6}$/;

type Step = 'email' | 'code';

/** Seconds remaining until `target` (never negative). */
function secondsUntil(target: number | null): number {
  return target ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0;
}

function describe(err: unknown): { message: string; codeLocked?: boolean } {
  if (err instanceof AuthApiError) {
    switch (err.code) {
      case 'OTP_INVALID':
        return { message: 'That code is not correct. Check the latest email and try again.' };
      case 'OTP_EXPIRED':
        return { message: 'This code has expired. Request a new code.', codeLocked: true };
      case 'OTP_LOCKED':
        return {
          message: 'Too many incorrect attempts. For your security, request a new code.',
          codeLocked: true,
        };
      default:
        return { message: err.message };
    }
  }
  return { message: 'Something went wrong. Please try again.' };
}

/**
 * The ONE sign-in page for every BEZENT user — Super Admin, Company Admin, HR,
 * Manager, Employee and custom roles (ADR-018). Passwordless: email → one-time
 * code → session. What the user may open is resolved by the server afterwards.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { status, access, completeSignIn } = useAuth();
  const next = safeNextPath(params.get('next'));

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [alert, setAlert] = useState<string | null>(null);
  const [codeLocked, setCodeLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = otp.join('');
  const resendIn = secondsUntil(resendAt);

  // Drives the resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'code') {
      inputRefs.current[0]?.focus();
    }
  }, [step, challenge]);

  if (status === 'authenticated' && access) {
    return <Navigate to={next ?? landingPath(access)} replace />;
  }

  async function sendCode(address: string) {
    setBusy(true);
    setAlert(null);
    try {
      const issued = await authApi.requestOtp(address);
      setChallenge(issued);
      setResendAt(new Date(issued.resendAvailableAt).getTime());
      setOtp(['', '', '', '', '', '']);
      setCodeError(undefined);
      setCodeLocked(false);
      setStep('code');
    } catch (err) {
      if (err instanceof AuthApiError && err.code === 'OTP_RATE_LIMITED' && err.retryAfterSeconds) {
        setResendAt(Date.now() + err.retryAfterSeconds * 1000);
        // A code sent moments ago may still be valid: keep the code step open.
        if (challenge) setStep('code');
      }
      setAlert(describe(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitEmail(event: FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(address)) {
      setEmailError('Enter a valid work email address.');
      return;
    }
    setEmailError(undefined);
    await sendCode(address);
  }

  async function onSubmitCode(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    if (!CODE_PATTERN.test(code)) {
      setCodeError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setAlert(null);
    setCodeError(undefined);
    try {
      const result = await authApi.verifyOtp(challenge.challengeId, code);
      completeSignIn(result);
      navigate(next ?? result.defaultDestination, { replace: true });
    } catch (err) {
      const described = describe(err);
      setOtp(['', '', '', '', '', '']);
      setCodeLocked(Boolean(described.codeLocked));
      if (described.codeLocked) setResendAt(null);
      setAlert(described.message);
      inputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    if (busy || codeLocked) return;
    const digitsOnly = value.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (index + i < 6 && i < digitsOnly.length) {
          newOtp[index + i] = digitsOnly[i] ?? '';
        }
      }
      setOtp(newOtp);
      const nextIdx = Math.min(index + digitsOnly.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const char = digitsOnly.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (busy || codeLocked) return;
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    if (busy || codeLocked) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i] ?? '';
    }
    setOtp(newOtp);
    const targetIndex = Math.min(pasted.length, 5);
    inputRefs.current[targetIndex]?.focus();
  }

  function changeEmail() {
    setStep('email');
    setChallenge(null);
    setOtp(['', '', '', '', '', '']);
    setAlert(null);
    setCodeError(undefined);
    setCodeLocked(false);
  }

  return (
    <main className="bezent-login">
      <LoginBackground />

      <div className="bezent-login__panel">
        <div className="bezent-login__glass-card">
          <Stack gap="lg">
            <Stack gap="xs" align="center">
              <div className="bezent-login__mark-container">
                <span className="bezent-login__mark" aria-hidden="true">
                  <BezentIcon name="security" size={26} color="currentColor" />
                </span>
              </div>
              <h1 className="bezent-login__title">Sign in to BEZENT</h1>
              <p className="bezent-login__subtitle">
                {step === 'email'
                  ? 'Use your work email. We will send you a one-time sign-in code.'
                  : `Enter the 6-digit code sent to ${email.trim().toLowerCase()}.`}
              </p>
            </Stack>

            {status === 'loading' && <Alert variant="info">Checking your existing session…</Alert>}

            {alert && (
              <Alert
                variant="error"
                title="Sign-in problem"
                dismissible
                onDismiss={() => setAlert(null)}
              >
                {alert}
              </Alert>
            )}

            {step === 'email' ? (
              <form onSubmit={onSubmitEmail} noValidate>
                <Stack gap="md">
                  <Input
                    label="Work email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={emailError}
                    disabled={busy}
                    autoFocus
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={busy}
                    disabled={busy || resendIn > 0}
                  >
                    {resendIn > 0
                      ? `Wait ${resendIn}s before requesting code`
                      : 'Send sign-in code'}
                  </Button>
                </Stack>
              </form>
            ) : (
              <form onSubmit={onSubmitCode} noValidate>
                <Stack gap="md">
                  <div className="bezent-login__otp-field">
                    <label className="bezent-login__otp-label" id="otp-label">
                      Sign-in code
                    </label>
                    <div
                      className="bezent-login__otp-group"
                      role="group"
                      aria-labelledby="otp-label"
                      onPaste={handleDigitPaste}
                    >
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          aria-label={`Digit ${index + 1} of 6`}
                          className={`bezent-login__otp-digit ${digit ? 'bezent-login__otp-digit--filled' : ''} ${codeError ? 'bezent-login__otp-digit--error' : ''}`}
                          value={digit}
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(index, e)}
                          disabled={busy || codeLocked}
                        />
                      ))}
                    </div>
                    {codeError ? (
                      <p className="bezent-login__otp-error" role="alert">
                        {codeError}
                      </p>
                    ) : (
                      <p className="bezent-login__otp-helper">
                        The code expires 10 minutes after it is sent and works once.
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={busy}
                    disabled={busy || codeLocked || code.length !== 6}
                  >
                    Verify and sign in
                  </Button>
                  <Inline justify="between" align="center" wrap>
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      onClick={changeEmail}
                      disabled={busy}
                      leftIcon={<BezentIcon name="arrowLeft" size={16} color="currentColor" />}
                    >
                      Change email
                    </Button>
                    <Button
                      type="button"
                      variant="text"
                      size="sm"
                      onClick={() => void sendCode(email.trim().toLowerCase())}
                      disabled={busy || resendIn > 0}
                      leftIcon={<BezentIcon name="timer" size={16} color="currentColor" />}
                    >
                      {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                    </Button>
                  </Inline>
                </Stack>
              </form>
            )}

            <p className="bezent-login__footnote">
              One sign-in for every BEZENT workspace. No password is needed.
            </p>
          </Stack>
        </div>
      </div>
    </main>
  );
}
