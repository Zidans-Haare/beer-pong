'use client';

import { MotionConfig, useAnimate, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content with smooth enter/exit animations
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [scope, animate] = useAnimate();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || pathname.endsWith('/tv') || pathname.includes('/broadcast') || pathname === '/chat') return;
    const animation = animate(scope.current, { opacity: [0.65, 1] }, { duration: 0.18, ease: 'easeOut' });
    return () => animation.stop();
  }, [pathname, reducedMotion, animate, scope]);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={scope} style={{ width: '100%', minWidth: 0 }}>{children}</div>
    </MotionConfig>
  );
}
