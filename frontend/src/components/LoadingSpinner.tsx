interface Props {
  fullScreen?: boolean;
}

export default function LoadingSpinner({ fullScreen }: Props) {
  const wrapper = fullScreen
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-12';
  return (
    <div className={wrapper}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dota-gold" />
    </div>
  );
}
