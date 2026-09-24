import { useNavigate } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';
import { EmployeeRegistration } from '../components/EmployeeRegistration';

export function EmployeeRegistrationPage({ onCancel }: { onCancel?: () => void } = {}) {
  const navigate = useNavigate();

  return (
    <>
      <OnboardingPage title="Employee Administration" onAddNewHire={() => {}} />
      <EmployeeRegistration
        onCancel={() => {
          if (onCancel) {
            onCancel();
          } else {
            navigate('/hrms/administration/employee-administration');
          }
        }}
      />
    </>
  );
}

export default EmployeeRegistrationPage;
