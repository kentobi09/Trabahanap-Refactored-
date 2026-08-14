"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, AlertTriangle, FileText, CheckCircle, Shield } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "User Management",
      href: "/dashboard/user-management",
      icon: Users,
    },
    {
      name: "User Reports",
      href: "/dashboard/user-reports",
      icon: AlertTriangle,
    },
    {
      name: "Job Requests",
      href: "/dashboard/job-requests",
      icon: FileText,
    },
    {
      name: "Verification Requests",
      href: "/dashboard/verification-requests",
      icon: CheckCircle,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0B153C] text-white flex flex-col shadow-xl z-20">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-700/60 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-[#0B153C] font-bold shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Trabahanap</h1>
            <span className="text-xs text-amber-400 font-semibold tracking-wide">ADMIN PORTAL</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-amber-500 text-[#0B153C] font-bold shadow-md"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#0B153C]" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/60 text-center text-xs text-slate-400">
          Trabahanap v2.0 • Admin Mode
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {navItems.find((i) => pathname.startsWith(i.href))?.name || "Dashboard"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage users, reports, job requests & verifications</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 bg-[#0B153C] text-amber-400 font-semibold text-xs rounded-lg shadow-sm flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>System Online</span>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
