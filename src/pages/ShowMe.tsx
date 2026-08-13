import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { FloatingHeader } from "@/components/dashboard/FloatingHeader";
import { ShowMeSection } from "@/components/dashboard/ShowMeSection";

type Role = "SDR" | "Closer";

const ShowMe = () => {
  const [role, setRole] = useState<Role>("SDR");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <FloatingHeader role={role} onRoleChange={setRole} />
          <main className="flex-1 px-3 sm:px-4 pb-8">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Show me</h1>
              <p className="text-sm text-muted-foreground">Reuniões e conversão por cliente do mês</p>
            </div>
            <ShowMeSection />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ShowMe;
