import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getCurrentAdmin } from "@/lib/auth";

async function ProtectedDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAdmin();

  if (!user) {
    redirect("/login");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </Suspense>
  );
}