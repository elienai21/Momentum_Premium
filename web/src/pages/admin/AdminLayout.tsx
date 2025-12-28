import { Outlet, NavLink } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Admin Console</h1>
      <nav className="flex flex-wrap gap-2">
        <NavLink to="plans" className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">Planos & Recursos</NavLink>
        <NavLink to="voice" className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">Voz & Perfis</NavLink>
        <NavLink to="support" className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">Suporte (RAG)</NavLink>
        <NavLink to="emergency" className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">Emergência</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
