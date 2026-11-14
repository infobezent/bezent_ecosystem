import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Bulk Employee Import route wrapper.
 * Redirects to the Employee Directory with the Standalone Import Modal open.
 */
export const EmployeeImportPage: React.FC = () => {
  return <Navigate to="/hrms/workforce/employees?action=import" replace />;
};
