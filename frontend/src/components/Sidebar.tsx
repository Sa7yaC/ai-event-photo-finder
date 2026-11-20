"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api, EventItem } from "@/lib/api";
import { auth, useAccountUser } from "@/lib/auth";
import { JoinEventModal } from "@/components/JoinEventModal";
import {
  Home,
  Calendar,
  UserCheck,
  Images,
  Settings,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Folder,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Sparkles
} from "lucide-react";

interface SidebarProps {
  activeEventId?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function EventMark({ name, joined = false }: { name: string; joined?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-extrabold uppercase ${
        joined
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

export function Sidebar({ activeEventId, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(true);
  const [participatedOpen, setParticipatedOpen] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(activeEventId || null);
  const [expandedParticipatedId, setExpandedParticipatedId] = useState<string | null>("pe-1");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const user = useAccountUser();

  // Participated events (events the user attended / searched photos in)
  const participatedEvents = [
    {
      id: "pe-1",
      name: "Tech Summit 2026",
      slug: "tech-summit-2026",
      matchedCount: 24,
    },
    {
      id: "pe-2",
      name: "Houston Wedding Gala",
      slug: "houston-wedding-2026",
      matchedCount: 18,
    },
    {
      id: "pe-3",
      name: "Friends Cafe Reunion",
      slug: "friends-cafe-reunion",
      matchedCount: 9,
    },
  ];

  // Fetch organized events list
  useEffect(() => {
    let isMounted = true;
    api.listEvents()
      .then((data) => {
        if (isMounted) {
          setEvents(data);
          if (data.length > 0) {
            setExpandedEventId((current) => current ?? activeEventId ?? data[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully if API not ready
      });
    return () => {
      isMounted = false;
    };
  }, [activeEventId]);

  const handleLogout = async () => {
    try {
      await auth.logout();
      sessionStorage.clear();
    } catch { }
    router.push("/login");
  };

  // Main Navigation items
  const mainNavItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: Home,
      isActive: (pathname === "/dashboard" && currentTab !== "participated") || pathname === "/",
    },
    {
      label: "Photos",
      badge: "Premium",
      href: "/photos",
      icon: Images,
      isActive: pathname === "/photos",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 bg-[#fbfbfb] border-r border-slate-200/80 flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${mobileOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0"
          } ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Top: Brand Header & Collapse Toggle */}
        <div className="flex flex-col flex-1 min-h-0">
          <div
            className={`h-16 flex items-center border-b border-slate-100 shrink-0 transition-all ${isCollapsed ? "px-2.5 justify-between" : "px-4 justify-between"
              }`}
          >
            {isCollapsed ? (
              <>
                {/* Collapsed State: Standalone emblem symbol of the logo only */}
                <Link
                  href="/"
                  className="flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 transition-colors group shrink-0"
                  title="Sharext Home"
                >
                  <img
                    src="/sharext-symbol.png"
                    alt="Sharext"
                    className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </Link>

                {/* Desktop Expand Button */}
                <button
                  onClick={() => setIsCollapsed(false)}
                  aria-label="Expand sidebar"
                  className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                {/* Expanded State: Full horizontal logo */}
                <Link
                  href="/"
                  className="flex items-center overflow-hidden group py-1"
                  title="Sharext Home"
                >
                  <img
                    src="/sharext-sidebar-logo.png?v=black-v4"
                    alt="Sharext"
                    className="h-8 w-auto max-w-[155px] object-contain select-none transition-transform duration-200 group-hover:scale-102"
                  />
                </Link>

                {/* Collapse toggle (Desktop) / Close button (Mobile) */}
                <div className="flex items-center gap-1">
                  {/* Mobile Close Button */}
                  <button
                    onClick={onMobileClose}
                    aria-label="Close sidebar"
                    className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Close sidebar"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Desktop Collapse Button */}
                  <button
                    onClick={() => setIsCollapsed(true)}
                    aria-label="Collapse sidebar"
                    className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Navigation Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
            {/* 1. Main Navigation Section */}
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.isActive;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                      isCollapsed ? "justify-center px-2" : ""
                    } ${
                      isActive
                        ? "bg-[#0053FF]/10 font-semibold text-[#0053FF]"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    }`}
                    title={
                      isCollapsed
                        ? `${item.label}${item.badge ? ` · ${item.badge}` : ""}`
                        : undefined
                    }
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-[#0053FF]" : "text-slate-500"}`}
                    />

                    {!isCollapsed && (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* 2. Events Section (formerly Workspace) */}
            <div className="space-y-2">
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3">
                  <button
                    onClick={() => setEventsOpen(!eventsOpen)}
                    className="-my-2 flex cursor-pointer select-none items-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-800"
                  >
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span className="whitespace-nowrap">Events created</span>
                    <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                      {events.length}
                    </span>
                    {eventsOpen ? (
                      <ChevronUp className="h-3 w-3 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    )}
                  </button>

                  <Link
                    href="/events/new"
                    className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title="Create new event"
                    aria-label="Create new event"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              {eventsOpen && (
                <div className="space-y-1">
                  {/* Dynamic organized events */}
                  {events.length > 0 ? (
                    events.slice(0, 5).map((event) => {
                      const isExpanded = expandedEventId === event.id;
                      const isEventActive = pathname.includes(`/events/${event.id}`);

                      return (
                        <div key={event.id} className="space-y-1">
                          {/* Event Row */}
                          <button
                            onClick={() => {
                              if (isCollapsed) setIsCollapsed(false);
                              setExpandedEventId(isExpanded ? null : event.id);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left ${isCollapsed ? "justify-center px-2" : ""
                              } ${isEventActive && !isExpanded
                                ? "bg-[#0053FF]/10 text-[#0053FF] font-semibold"
                                : "text-slate-700 hover:bg-slate-100/70"
                              }`}
                            title={event.name}
                          >
                            <EventMark name={event.name} />

                            {!isCollapsed && (
                              <span className="truncate flex-1 font-medium">
                                {event.name}
                              </span>
                            )}
                          </button>

                          {/* Sub-Actions */}
                          {!isCollapsed && isExpanded && (
                            <div className="ml-5 pl-3 border-l-2 border-slate-200/80 space-y-1 py-1">
                              <Link
                                href={`/events/${event.id}/manage`}
                                className={`flex min-h-9 items-center gap-2 px-3 rounded-xl text-xs font-semibold transition-all ${pathname.includes(`/events/${event.id}/manage`)
                                  ? "bg-[#0053FF]/10 text-[#0053FF]"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                                  }`}
                              >
                                <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">Gallery and photos</span>
                              </Link>

                              <Link
                                href={`/events/${event.slug}`}
                                className="flex min-h-9 items-center gap-2 px-3 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 transition-colors"
                              >
                                <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">Attendee portal</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      {!isCollapsed && <span>No events created yet</span>}
                    </div>
                  )}

                  {/* + Create Event Action */}
                  <Link
                    href="/events/new"
                      className={`flex min-h-9 items-center gap-2.5 px-3 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 transition-colors ${isCollapsed ? "justify-center px-2" : ""
                        }`}
                    title="Create new event"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>New event</span>}
                  </Link>
                </div>
              )}
            </div>

            {/* 3. Dedicated Participated Events Section */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3">
                  <button
                    onClick={() => setParticipatedOpen(!participatedOpen)}
                    className="-my-2 flex cursor-pointer select-none items-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-800"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                    <span className="whitespace-nowrap">Events joined</span>
                    <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                      {participatedEvents.length}
                    </span>
                    {participatedOpen ? (
                      <ChevronUp className="h-3 w-3 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    )}
                  </button>

                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title="Join event"
                    aria-label="Join event"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {participatedOpen && (
                <div className="space-y-1">
                  {participatedEvents.map((pe) => {
                    const isExpanded = expandedParticipatedId === pe.id;
                    return (
                      <div key={pe.id} className="space-y-1">
                        {/* Participated Event Row */}
                        <button
                          onClick={() => {
                            if (isCollapsed) setIsCollapsed(false);
                            setExpandedParticipatedId(isExpanded ? null : pe.id);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left ${isCollapsed ? "justify-center px-2" : ""
                            } text-slate-700 hover:bg-slate-100/70`}
                          title={pe.name}
                        >
                          <EventMark name={pe.name} joined />

                          {!isCollapsed && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className="truncate font-medium text-slate-800">
                                {pe.name}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 shrink-0 ml-1">
                                {pe.matchedCount} photos
                              </span>
                            </div>
                          )}
                        </button>

                        {/* Sub-Actions for Participated Event */}
                        {!isCollapsed && isExpanded && (
                          <div className="ml-5 pl-3 border-l-2 border-slate-200/80 space-y-1 py-1">
                            <Link
                              href={`/events/${pe.slug}`}
                              className="flex min-h-9 items-center gap-2 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#0053FF] hover:bg-slate-100/60 transition-colors"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-[#FCAA02] shrink-0" />
                              <span className="truncate">Matched photos ({pe.matchedCount})</span>
                            </Link>

                            <Link
                              href={`/events/${pe.slug}`}
                              className="flex min-h-9 items-center gap-2 px-3 rounded-xl text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 transition-colors"
                            >
                              <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">Public gallery</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Settings, Log out, Profile */}
        <div className="shrink-0 space-y-1 border-t border-slate-200/80 bg-[#fbfbfb] p-3">
          {/* Settings */}
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm ${isCollapsed ? "justify-center px-2" : ""
              } ${pathname === "/settings"
                ? "bg-[#0053FF]/10 font-semibold text-[#0053FF]"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            title="Settings"
          >
            <Settings
              className={`h-4 w-4 shrink-0 ${pathname === "/settings" ? "text-[#0053FF]" : "text-slate-500"
                }`}
            />
            {!isCollapsed && <span>Settings</span>}
          </Link>

          {/* Log out */}
          <button
            onClick={handleLogout}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 sm:text-sm ${isCollapsed ? "justify-center px-2" : ""
              }`}
            title="Log out"
          >
            <LogOut className="h-4 w-4 shrink-0 text-red-500" />
            {!isCollapsed && <span>Log out</span>}
          </button>

          {/* Profile */}
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${isCollapsed ? "justify-center px-2" : ""
              } ${pathname === "/profile"
                ? "bg-[#0053FF]/10 text-[#0053FF]"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`}
            title="Profile"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0053FF] text-[11px] font-bold text-white">
              {user?.name?.trim().charAt(0).toUpperCase() || <User className="h-4 w-4" />}
            </div>

            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-xs font-semibold ${
                      pathname === "/profile" ? "text-[#0053FF]" : "text-slate-900"
                    }`}
                  >
                    {user?.name || "My profile"}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {user?.email || "View account"}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </>
            )}
          </Link>
        </div>
      </aside >

      <JoinEventModal open={showJoinModal} onClose={() => setShowJoinModal(false)} />
    </>
  );
}
