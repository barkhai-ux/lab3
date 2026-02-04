interface Props {
  fullScreen?: boolean;
}

export default function LoadingSpinner({ fullScreen }: Props) {
  const wrapper = fullScreen
    ? 'flex items-center justify-center min-h-screen bg-dota-bg'
    : 'flex items-center justify-center py-12';

  return (
    <div className={wrapper}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-dota-border border-t-dota-gold rounded-full animate-spin" />
        <span className="text-label text-dota-text-muted uppercase tracking-wider">Loading</span>
      </div>
    </div>
  );
}
