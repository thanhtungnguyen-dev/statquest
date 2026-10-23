import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "StatQuest",
  title: "StatQuest",
  description: "Turn learning goals into focused daily missions, track progress, and take the next useful step.",
  icons: {
    icon: [{ url: "/branding/statquest-app-icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "StatQuest — Make the next step count",
    description: "From learning goals to focused missions and visible progress.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("statquest.theme.v1");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){document.documentElement.setAttribute("data-theme","light")}})()',
          }}
        />
      </head>
      <body>
        <div className="pointer-grid-glow" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
