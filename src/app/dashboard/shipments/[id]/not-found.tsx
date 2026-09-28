import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export default function ShipmentNotFound() {
  const t = useTranslations('shipments');

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        icon={Package}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Link
            href="/dashboard/shipments"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('notFound.backToShipments')}
          </Link>
        }
      />
    </div>
  );
}
