import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  BellRing,
  Network,
  Menu,
  X,
  ChevronRight,
  Activity,
} from "lucide-react";

const navLinks = [
  {
    name: "Analyze",
    path: "/",
    icon: ScanSearch,
  },
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Alerts",
    path: "/alerts",
    icon: BellRing,
  },
  {
    name: "Campaign Analysis",
    path: "/duplicates",
    icon: Network,
  },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 shadow-lg shadow-black/10 backdrop-blur-xl">
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <div className="flex h-[76px] items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/"
            onClick={closeMenu}
            className="group flex shrink-0 items-center gap-3"
            aria-label="FinShield AI home"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 transition-all duration-300 group-hover:border-cyan-300/60 group-hover:bg-cyan-400/15">
              <ShieldCheck
                size={26}
                strokeWidth={2}
                className="text-cyan-400"
              />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                FinShield
                <span className="text-cyan-400"> AI</span>
              </h1>

              <p className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:block">
                Financial Threat Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 xl:px-4 ${
                    active
                      ? "bg-cyan-400/10 text-cyan-300"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                  }`}
                >
                  <Icon size={17} strokeWidth={1.9} />
                  <span>{item.name}</span>

                  {active && (
                    <span className="absolute inset-x-3 -bottom-[17px] h-0.5 rounded-full bg-cyan-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Status + Mobile Toggle */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 sm:flex">
              <Activity size={14} className="text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">
                Threat Monitoring
              </span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300 lg:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-slate-800 py-3 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.name}
                    </span>

                    {active && <ChevronRight size={17} />}
                  </Link>
                );
              })}

              <div className="mt-2 flex items-center gap-2 border-t border-slate-800 px-4 pt-4 sm:hidden">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">
                  Threat Monitoring
                </span>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
