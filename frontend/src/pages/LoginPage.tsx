import { getSteamLoginUrl } from '../api/auth';

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = getSteamLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-dota-radiant/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[800px] h-[800px] bg-dota-dire/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Main card */}
        <div className="dota-card p-8 sm:p-12 text-center">
          {/* Logo area */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-dota-gold/20 to-dota-gold/5 border border-dota-gold/30 mb-4">
              <svg
                viewBox="0 0 24 24"
                className="w-10 h-10 text-dota-gold"
                fill="currentColor"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-dota-gold text-glow-gold mb-2">
              Dota 2 Analyzer
            </h1>
            <p className="text-dota-text-secondary text-sm sm:text-base max-w-xs mx-auto">
              Deep dive into your replays, track your performance, and level up your game.
            </p>
          </div>

          {/* Features list */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="stat-box">
              <div className="text-dota-gold text-lg mb-1">
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-xs text-dota-text-muted">Stats</span>
            </div>
            <div className="stat-box">
              <div className="text-dota-gold text-lg mb-1">
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="text-xs text-dota-text-muted">Vision</span>
            </div>
            <div className="stat-box">
              <div className="text-dota-gold text-lg mb-1">
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs text-dota-text-muted">Insights</span>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            className="w-full dota-btn-gold py-3 px-6 text-base font-semibold flex items-center justify-center gap-3 group"
          >
            <svg
              viewBox="0 0 256 259"
              className="w-6 h-6 transition-transform group-hover:scale-110"
              fill="currentColor"
            >
              <path d="M239.162 0v259H0v-25.974l167.5-75.476-52.67-24.907L0 180.47V0h239.162zM138.058 115.388l-33.028 15.25 33.028 15.593 32.953-15.593-32.953-15.25z" />
            </svg>
            Sign in with Steam
          </button>

          <p className="mt-6 text-xs text-dota-text-muted">
            We only access your public Steam profile and match history.
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="flex justify-center mt-6 gap-8 text-dota-text-muted text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-dota-radiant/50" />
            Radiant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-dota-dire/50" />
            Dire
          </span>
        </div>
      </div>
    </div>
  );
}
