import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 py-24 text-center dark:bg-gray-950">
      <div className="flex flex-col items-center gap-2">
        <span className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</span>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          {t('description')}
        </p>
      </div>
      <Link
        href="/dashboard/shipments"
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
      >
        {t('backToDashboard')}
      </Link>
    </div>
  );
}
