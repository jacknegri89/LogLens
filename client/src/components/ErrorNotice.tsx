/** A failure message, set apart from the content by a marker-coloured rule. */
export function ErrorNotice({
  title,
  message,
  className = '',
}: {
  title: string;
  message: string;
  className?: string;
}) {
  return (
    <div role="alert" className={`border-l-4 border-marker pl-4 ${className}`}>
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-1 text-chalk">{message}</p>
    </div>
  );
}
