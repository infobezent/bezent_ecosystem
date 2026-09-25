import { useNavigate, useLocation } from 'react-router-dom';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import type { EmployeeRegistrationDraft } from '../components/DraftsModal';

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

  return <EmployeeRegistration onCancel={handleCancel} initialDraft={initialDraft} />;
}

export default EmployeeRegistrationPage;
