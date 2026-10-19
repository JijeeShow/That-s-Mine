"use client";

import dynamic from "next/dynamic";

const OceanScene = dynamic(() => import("@/components/ocean/OceanScene"), { ssr: false });
const Aboutme = dynamic(() => import("@/components/aboutme/Aboutme"), { ssr: false });

export default function Home() {
  return (
    <>
      <OceanScene />
      <Aboutme />
    </>
  );
}
