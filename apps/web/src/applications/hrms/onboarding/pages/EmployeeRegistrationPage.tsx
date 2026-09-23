import { useNavigate } from 'react-router-dom';
import { EmployeeRegistration } from '../components/EmployeeRegistration';

export function EmployeeRegistrationPage({ onCancel }: { onCancel?: () => void } = {}) {
  const navigate = useNavigate();

  return (
    <EmployeeRegistration
      onCancel={() => {
        if (onCancel) {
          onCancel();
        } else {
          navigate('/hrms/administration/employee-administration');
        }
      }}
    />
  );
}

export default EmployeeRegistrationPage;
