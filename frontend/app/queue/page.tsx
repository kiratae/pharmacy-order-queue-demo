import { Suspense } from 'react';
import { QueueClient } from './queue-client';

export default function QueuePage() {
  return (
    <Suspense>
      <QueueClient />
    </Suspense>
  );
}
