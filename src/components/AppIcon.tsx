import type { SVGProps } from "react";

const paths = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
  book: "M12 5C8 2 4 3 3 4v16c3-2 6-1 9 1 3-2 6-3 9-1V4c-3-2-6-1-9 1Zm0 0v16",
  chat: "M21 11a9 9 0 0 1-9 9H4l-2 2 1-7a9 9 0 1 1 18-4ZM7 10h10M7 14h6",
  chart: "M4 20V10m8 10V4m8 16v-7M2 22h20",
  headphones: "M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7H4Zm16 0h2v7h-5v-7h3Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  search: "M19 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-2 6 5 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  collapse: "M9 3v18M4 3h16v18H4V3Zm13 5-4 4 4 4",
  edit: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6ZM4 22h17",
  repeat: "m17 2 4 4-4 4M3 11V6h18M7 22l-4-4 4-4m14-1v5H3",
  mic: "M8 5a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0V5Zm-4 6v1a8 8 0 0 0 16 0v-1M12 20v3m-4 0h8",
  bolt: "m13 2-9 12h7l-1 8 10-13h-8l1-7Z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 3",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  check: "m5 12 4 4L20 5",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  moon: "M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z",
} as const;
export type IconName = keyof typeof paths;
export default function AppIcon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
