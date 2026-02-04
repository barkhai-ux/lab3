interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="panel border-dota-dire p-4">
      <div className="flex items-center gap-3">
        <span className="text-dota-dire text-sm font-mono">ERROR</span>
        <span className="text-dota-text-secondary">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 btn btn-secondary text-sm"
        >
          Retry
        </button>
      )}
    </div>
  );
}
