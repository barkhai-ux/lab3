import { getSteamLoginUrl } from '../api/auth';

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = getSteamLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-dota-surface border border-gray-700 rounded-xl p-10 text-center max-w-md">
        <h1 className="text-3xl font-bold text-dota-gold mb-2">
          Dota 2 Match Analyzer
        </h1>
        <p className="text-gray-400 mb-8">
          Analyze your replays, track performance, and identify areas for
          improvement.
        </p>
        <button
          onClick={handleLogin}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-3 mx-auto"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          Sign in with Steam
        </button>
      </div>
    </div>
  );
}
