import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'GenZ Gaming Cafe OS', description: 'LAN-first gaming cafe management system' };

export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }