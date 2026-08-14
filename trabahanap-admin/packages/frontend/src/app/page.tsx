"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/user-management");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B153C] text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Trabahanap Admin Portal</h1>
        <p className="text-slate-300 text-sm">Redirecting to Dashboard...</p>
      </div>
    </div>
  );
}
