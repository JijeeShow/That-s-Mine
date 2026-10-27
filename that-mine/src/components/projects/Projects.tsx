import { CLEARINGS } from "../ocean/canyonLayout";
import { smooth } from "../../lib/math";

// One per project wall in the canyon, in order. Drafted from the About text - edit the names, wording and
// tags to match the real projects (the last one is this site).
const PROJECTS = [
  {
    title: "Finance & Accounting Platform",
    body: "Ledgers, invoicing and month-end reports for a finance team. I built features end to end, from the database tables to the screens they use every day.",
    tags: ["Full-stack", "SQL", "Automated tests"],
  },
  {
    title: "Online e-Services",
    body: "Requests and forms people used to file in person, moved online with status tracking. I owned features from the API to the UI.",
    tags: ["Web app", "REST API", "Forms"],
  },
  {
    title: "Data Portal",
    body: "A portal that turns raw data into searchable tables and charts people can explore and download.",
    tags: ["Search", "Charts", "Data"],
  },
  {
    title: "That's Mine",
    body: "This site: a scroll-driven dive from the surface down through the reef and into the canyon, built with 3D, SVG and a lot of scrolling.",
    tags: ["Next.js", "React Three Fiber", "TypeScript"],
  },
];

// Projects zone, over the canyon. arrive 0 -> 1: the silt clearing; the title rises at the end of it.
// leave 0 -> 1: walking into the canyon; the title fades as you set off. focus[i] 0 -> 1: how much the
// bay for project i is in view; its card slides in on that side of the screen.
export default function Projects({ arrive, leave, focus }: { arrive: number; leave: number; focus: number[] }) {
  const title = smooth((arrive - 0.75) / 0.25) * (1 - smooth((leave - 0.01) / 0.05));

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none", color: "white" }}>
      {title > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "18vh", // keep clear of the sand
            textAlign: "center",
            textShadow: "0 2px 16px rgba(0,30,60,0.5)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(2.25rem, 7vh, 4rem)",
              fontWeight: 700,
              opacity: title,
              transform: `translateY(${(1 - title) * 40}px)`,
            }}
          >
            Projects
          </h2>
          <p style={{ margin: "1.2vh 0 0", fontSize: "clamp(0.95rem, 2.3vh, 1.2rem)", opacity: title * 0.85 }}>
            Things I&apos;ve built
          </p>
        </div>
      )}

      {PROJECTS.map((project, i) => {
        const f = smooth(focus[i] ?? 0);
        if (f <= 0.01) return null;
        const onRight = (CLEARINGS[i]?.side ?? 1) === 1;
        return (
          // Sits over the dark project wall the canyon bend brings across that side of the screen.
          <article
            key={project.title + i}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              ...(onRight ? { right: 0 } : { left: 0 }),
              width: "max(42vw, 340px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: onRight ? "0 6vw 0 4vw" : "0 4vw 0 6vw",
              textShadow: "0 2px 18px rgba(0,8,20,0.75)",
            }}
          >
            <div style={{ opacity: f, transform: `translateY(${(1 - f) * 28}px)` }}>
            <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.08em", color: "rgba(150,210,255,0.85)" }}>
              {String(i + 1).padStart(2, "0")} / {String(PROJECTS.length).padStart(2, "0")}
            </p>
            <h3 style={{ margin: "10px 0 0", fontSize: "clamp(1.9rem, 5vh, 3rem)", fontWeight: 700, lineHeight: 1.1 }}>
              {project.title}
            </h3>
            <p style={{ margin: "16px 0 0", fontSize: "clamp(0.95rem, 2.1vh, 1.1rem)", lineHeight: 1.7, opacity: 0.85, maxWidth: "38ch" }}>
              {project.body}
            </p>
            <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "22px 0 0", padding: 0, listStyle: "none" }}>
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 13,
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: "rgba(255,255,255,0.1)",
                  }}
                >
                  {tag}
                </li>
              ))}
            </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}
