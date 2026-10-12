"use client";
import Image from "next/image";
import TodayDashboard from "@/components/TodayDashboard";
import MotionRegion from "@/components/MotionRegion";
import { useAuth } from "@/lib/auth";
export default function TodayPage() {
  const { displayName, isAnonymous } = useAuth();
  const name = isAnonymous ? "bạn" : displayName?.trim().split(/\s+/).at(-1) || "bạn";
  return <main className="study-page">
    <MotionRegion className="contents"><header className="study-hero"><div className="study-hero-copy" data-reveal><p className="eyebrow">Chào {name}, mình học tiếp nhé.</p><h1>A little practice.<br />A world of possibility.</h1><p>Tiếng Anh cho những cuộc trò chuyện mỗi ngày.</p></div><Image className="study-hero-art" data-float src="/blue-learning.png" alt="" width={420} height={300} sizes="(max-width: 639px) 96px, (max-width: 1023px) 35vw, 384px" priority /></header></MotionRegion>
    <TodayDashboard />
  </main>;
}
