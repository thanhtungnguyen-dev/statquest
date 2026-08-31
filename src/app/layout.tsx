import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StatQuest",
  description: "Turn ambitious goals into daily missions.",
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
