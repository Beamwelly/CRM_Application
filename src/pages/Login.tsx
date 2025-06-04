import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useCRM } from '@/context/hooks';

export default function Login() {
  const { isAuthenticated } = useCRM();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Wealth & Training CRM
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your leads, customers, and business
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
