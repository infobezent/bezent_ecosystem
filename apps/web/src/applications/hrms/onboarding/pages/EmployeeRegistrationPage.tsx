import { useNavigate, useLocation } from 'react-router-dom';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import type { EmployeeRegistrationDraft } from '../components/DraftsModal';
import { RegistrationConfigLoader } from '../registration/registrationConfig';

export function EmployeeRegistrationPage({ onCancel }: { onCancel?: () => void } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialDraft = (location.state as { draft?: EmployeeRegistrationDraft })?.draft || null;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/hrms/administration/onboarding');
    }
  };

  // The form renders only once the company's resolved Registration configuration is loaded.
  return (
    <RegistrationConfigLoader>
      <EmployeeRegistration onCancel={handleCancel} initialDraft={initialDraft} />
    </RegistrationConfigLoader>
  );
}

export default EmployeeRegistrationPage;
