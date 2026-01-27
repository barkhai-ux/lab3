interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-center">
      <p className="text-red-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-1 bg-red-700 rounded hover:bg-red-600 text-sm"
        >
          Retry
        </button>
      )}
    </div>
  );
}
