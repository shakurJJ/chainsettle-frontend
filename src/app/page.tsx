import { redirect } from 'next/navigation';

// Root page — redirect to dashboard overview (middleware handles auth check)
export default function RootPage() {
  redirect('/dashboard');
}
