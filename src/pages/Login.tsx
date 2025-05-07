import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { LoginForm } from '@/components/auth/LoginForm';
import { useCRM } from '@/context/hooks';

export default function Login() {
  const { isAuthenticated, loginWithGoogle } = useCRM();
  const navigate = useNavigate();
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    console.log("Google Login Success:", credentialResponse);
    setGoogleError(null);
    const idToken = credentialResponse.credential;
    if (idToken) {
      console.log("Google ID Token:", idToken);
      const success = await loginWithGoogle(idToken);
      if (!success) {
        setGoogleError("Google Sign-In failed. Please try again or use standard login.");
      }
    } else {
      console.error("Google login successful but ID token missing.");
      setGoogleError("Could not get necessary information from Google. Please try again.");
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google Login Failed');
    setGoogleError("Google Sign-In process failed. Please ensure popups are allowed and try again.");
  };

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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
          />
        </div>

        {googleError && (
          <p className="mt-4 text-center text-sm text-red-600">{googleError}</p>
        )}
      </div>
    </div>
  );
}
