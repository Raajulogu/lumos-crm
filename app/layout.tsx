import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { AuthProvider } from "@/lib/auth-context";
import { TaskTimerProvider } from "@/lib/task-timer-context";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: "Modern CRM designed for digital marketing teams. Manage clients, projects, deadlines, and employee performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <AuthProvider>
          <TaskTimerProvider>{children}</TaskTimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
