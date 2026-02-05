interface Props {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ fullScreen, size = 'md' }: Props) {
  const wrapper = fullScreen
    ? 'flex flex-col items-center justify-center min-h-screen gap-4'
    : 'flex flex-col items-center justify-center py-12 gap-4';

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={wrapper}>
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-dota-surface-light`}
        />
        {/* Spinning segment */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-transparent border-t-dota-gold animate-spin`}
        />
        {/* Inner glow effect */}
        <div
          className={`absolute inset-2 rounded-full bg-gradient-to-br from-dota-gold/10 to-transparent animate-pulse-slow`}
        />
      </div>
      {size !== 'sm' && (
        <span className="text-sm text-dota-text-muted animate-pulse">Loading...</span>
      )}
    </div>
  );
}
