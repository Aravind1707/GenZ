import type { Metadata } from 'next';
import './globals.css';
import StaffShell from './StaffShell';

export const metadata: Metadata = { title: 'GenZ Gaming Cafe OS', description: 'LAN-first gaming cafe management system' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><StaffShell>{children}</StaffShell></body></html>;
}
