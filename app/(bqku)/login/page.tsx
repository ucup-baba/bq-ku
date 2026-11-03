import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
export const metadata = { title: 'Masuk — BQ-ku' };
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
