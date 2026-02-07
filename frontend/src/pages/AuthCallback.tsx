import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

interface Props {
  onAuth: () => Promise<void>;
}

export default function AuthCallback({ onAuth }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Clear sensitive data from URL immediately to prevent leakage via
      // browser history, referrer headers, or server logs
      window.history.replaceState({}, '', window.location.pathname);

      localStorage.setItem('token', token);
      const steamId = searchParams.get('steam_id');
      const name = searchParams.get('name');
      if (steamId) localStorage.setItem('steam_id', steamId);
      if (name) localStorage.setItem('persona_name', name);
      onAuth().then(() => navigate('/', { replace: true }));
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, onAuth]);

  return <LoadingSpinner fullScreen />;
}
