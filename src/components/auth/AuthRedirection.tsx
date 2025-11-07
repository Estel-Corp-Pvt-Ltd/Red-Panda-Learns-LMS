import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type AuthMode = 'verifyEmail' | 'resetPassword' | 'recoverEmail';

const AuthRedirection: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthRedirection = async () => {
      try {
        const mode = searchParams.get('mode') as AuthMode;
        const oobCode = searchParams.get('oobCode');

        if (!mode || !oobCode) {
          setStatus('error');
          setMessage('Missing required parameters');
          return;
        }

        switch (mode) {
          case 'verifyEmail':
            navigate('/auth/verify-email?oobCode=' + oobCode, { replace: true });
            break;

          case 'resetPassword':
            navigate('/auth/reset-password?oobCode=' + oobCode, { replace: true });
            break;

          default:
            setStatus('error');
            setMessage('Invalid authentication mode');
        }
      } catch (error) {
        console.error('Auth redirection error:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
      }
    };

    handleAuthRedirection();
  }, [searchParams, navigate]);

  const getStatusContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Processing authentication...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-600 text-center">{message}</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 text-center mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h1 className="text-white text-xl font-semibold">Authentication</h1>
        </div>
        {getStatusContent()}
      </div>
    </div>
  );
};

export default AuthRedirection;
