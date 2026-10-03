"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "authenticated") router.replace("/dashboard");
    else if (state.status === "anonymous") router.replace("/login");
  }, [state.status, router]);

  return <Spinner />;
}
