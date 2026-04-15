import { Navigate } from 'react-router-dom';

export default function TaxiAdminLoginRedirect() {
  return <Navigate to="/admin/login" replace />;
}
