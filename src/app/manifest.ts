import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sentinel — informations incendies",
    short_name: "Sentinel",
    description: "Informations sourcées et prudentes pendant les incendies.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ec",
    theme_color: "#17201d",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
