import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MatchInputPanel() {
  const [matchId, setMatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input on / key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const id = matchId.trim();
    if (!id) {
      setError('Enter a match ID');
      return;
    }

    if (!/^\d+$/.test(id)) {
      setError('Match ID must be a number');
      return;
    }

    setLoading(true);

    // Navigate to match detail page
    navigate(`/match/${id}`);
    setLoading(false);
  };

  return (
    <div className="panel p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            placeholder="Enter Match ID to analyze..."
            className="input w-full pr-12"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-label text-dota-text-muted bg-dota-accent px-1.5 py-0.5 rounded">
            /
          </kbd>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Loading...' : 'Analyze'}
        </button>
      </form>
      {error && (
        <p className="text-sm text-dota-dire mt-2">{error}</p>
      )}
    </div>
  );
}
