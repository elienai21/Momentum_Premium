import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SupportDock from "./SupportDock";

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] transition-all duration-500">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={`
          flex flex-col flex-1 transition-all duration-500
          ${sidebarOpen ? "ml-60 md:ml-60" : "ml-0 md:ml-60"}
        `}
      >
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 md:p-6 pt-20 md:pt-24 overflow-auto min-h-screen bg-[var(--bg)]">
          <Outlet />
        </main>

        <SupportDock />
      </div>
    </div>
  );
};

export default Layout;
