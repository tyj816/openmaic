import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teaching Design',
};

export default function TeachingDesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
