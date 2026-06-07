"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** @deprecated Onboarding autonomo rimosso — piattaforma invite-only */
export default function OnboardingPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/no-access");
  }, [router]);
  return null;
}
