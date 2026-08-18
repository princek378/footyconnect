"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AuthGuard({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (adminOnly && profile && !profile.isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [user, profile, loading, adminOnly, router]);

  if (loading || !user || (adminOnly && profile && !profile.isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return <>{children}</>;
}
