'use client';

import { ReactNode } from 'react';
import PageTransition from './PageTransition';

interface ClientLayoutProps {
  children: ReactNode;
}

/**
 * Client-side wrapper for layout components that need client features
 * (animations, transitions, etc.)
 */
export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <PageTransition>
      {children}
    </PageTransition>
  );
}
