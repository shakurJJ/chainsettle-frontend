"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            A critical error occurred and the application could not recover.
          </p>
          {error.message ? (
            <p className="mt-4 break-words rounded-md bg-gray-100 p-3 text-left text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {error.message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
