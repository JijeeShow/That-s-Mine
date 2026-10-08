"use client";

import dynamic from "next/dynamic";

const OceanScene = dynamic(() => import("@/components/OceanScene"), {
  ssr: false,
});

export default function Home() {
  return <OceanScene />;
}
