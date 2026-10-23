"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OrderPaymentRefresh({ pending }: { pending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => router.refresh(), 5000);
    const stop = window.setTimeout(() => window.clearInterval(timer), 120_000);
    return () => { window.clearInterval(timer); window.clearTimeout(stop); };
  }, [pending, router]);
  return pending ? <p className="muted-copy" role="status">Waiting for PayHero’s payment confirmation…</p> : null;
}
