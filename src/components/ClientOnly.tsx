'use client';
import { useState, useEffect } from 'react';

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-4">
                 {/* Placeholder for action buttons */}
                 <div className="flex gap-2 pt-2">
                    <div className="bg-slate-700 h-10 w-36 rounded animate-pulse"></div>
                    <div className="bg-slate-700 h-10 w-36 rounded animate-pulse"></div>
                </div>
                 {/* Placeholder for contact inputs */}
                 <div className="h-6 bg-slate-700 rounded w-1/3 mb-2 mt-4"></div>
                 <div className="h-10 bg-slate-700 rounded"></div>
                 <div className="h-6 bg-slate-700 rounded w-1/3 mb-2 mt-4"></div>
                 <div className="h-10 bg-slate-700 rounded"></div>
            </div>
            <div className="space-y-4 animate-pulse">
                {/* Placeholder for selectors */}
                <div><div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div><div className="h-10 bg-slate-700 rounded"></div></div>
                <div><div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div><div className="h-10 bg-slate-700 rounded"></div></div>
            </div>
        </div>
    );
  }

  return <>{children}</>;
}
