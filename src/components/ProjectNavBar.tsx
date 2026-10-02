"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ProjectTab = "home" | "work" | "decisions" | "intelligence";

interface Props {
  projectId: string;
  projectName: string;
  active: ProjectTab;
  // Project Workspace switches Home/Work in place (no reload, keeps workstream
  // state); everywhere else these fall back to routing into the workspace.
  onHome?: () => void;
  onWork?: () => void;
}

// Project nav — Home / Work / Decisions / Intelligence. The one project shell
// bar, shared by Project Workspace, Decision Lab and BA Intelligence so all four
// destinations visibly stay inside the active project.
// Below ~480px the breadcrumb and the four tabs split onto their own rows
// (project-nav-bar CSS) so the tabs get the full row width — at that width the
// breadcrumb alone is short enough to never need it, while cramming both onto
// one row is what caused tabs to run off-screen with no visible way to reach
// them. The tabs row keeps horizontal scroll plus an edge fade as a safety net
// (long labels, larger text-zoom), and the active tab is scrolled into view.
export default function ProjectNavBar({ projectId, projectName, active, onHome, onWork }: Props) {
  const router = useRouter();
  const tabsRowRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [tabsOverflowing, setTabsOverflowing] = useState(false);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);
  useEffect(() => {
    const el = tabsRowRef.current;
    if (!el) return;
    const check = () => setTabsOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, []);

  const TABS: { id: ProjectTab; label: string; onClick: () => void }[] = [
    { id: "home",         label: "Home",         onClick: onHome ?? (() => router.push(`/projects/${projectId}`)) },
    { id: "work",         label: "Work",         onClick: onWork ?? (() => router.push(`/projects/${projectId}?tab=work`)) },
    { id: "decisions",    label: "Decisions",    onClick: () => router.push(`/decision-lab?project=${projectId}`) },
    { id: "intelligence", label: "Intelligence", onClick: () => router.push(`/ba-intelligence?project=${projectId}`) },
  ];

  return (
    <div className="project-nav-bar" style={{flexShrink:0,display:"flex",alignItems:"center",gap:2,padding:"0 20px",height:52,borderBottom:"1px solid var(--lc-border)",background:"var(--lc-surface)"}}>
      <div className="project-nav-crumb" style={{display:"flex",alignItems:"center",flexShrink:0,minWidth:0}}>
        <button onClick={()=>router.push("/projects")}
          style={{display:"flex",alignItems:"center",gap:4,fontSize:11.5,color:"var(--lc-text-3)",background:"none",border:"none",cursor:"pointer",padding:0,marginRight:14,flexShrink:0}}
          onMouseEnter={e=>e.currentTarget.style.color="var(--lc-text-2)"} onMouseLeave={e=>e.currentTarget.style.color="var(--lc-text-3)"}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg> All projects
        </button>
        <span style={{fontSize:13,fontWeight:700,color:"var(--lc-text-1)",marginRight:18,flexShrink:0,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{projectName}</span>
      </div>
      <div className={`project-tabs-row${tabsOverflowing ? " is-scrollable" : ""}`} ref={tabsRowRef} style={{display:"flex",alignItems:"center",gap:2,overflowX:"auto"}}>
        {TABS.map(t=>{
          const isActive = t.id===active;
          return (
            <button key={t.id} onClick={t.onClick} ref={isActive ? activeTabRef : null} aria-current={isActive ? "page" : undefined}
              style={{padding:"7px 12px",borderRadius:8,fontSize:12.5,fontWeight:isActive?700:600,color:isActive?"var(--teal)":"var(--lc-text-2)",background:isActive?"rgba(52,64,125,.07)":"none",border:"1px solid transparent",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",fontFamily:"inherit"}}
              onMouseEnter={e=>{if(!isActive)e.currentTarget.style.color="var(--lc-text-1)";}}
              onMouseLeave={e=>{if(!isActive)e.currentTarget.style.color="var(--lc-text-2)";}}>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
