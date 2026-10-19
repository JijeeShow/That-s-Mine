// Real page-flow section (not part of OceanScene's pinned track) - once
// the ocean scroll hands off, this just scrolls normally like any other
// page content. Placeholder "test" content for now.
export default function Aboutme() {
  return (
    <section
      id="about"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--sea-deep)",
        color: "white",
        textAlign: "center",
        padding: "0 8vw",
      }}
    >
      <div>
        <p
          style={{
            fontSize: "0.9rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.8,
            margin: 0,
            marginBottom: "0.75rem",
          }}
        >
          About
        </p>
        <h2 style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 700, margin: 0 }}>
          test
        </h2>
      </div>
    </section>
  );
}
