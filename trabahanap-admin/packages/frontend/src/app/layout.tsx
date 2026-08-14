import React from "react";
import "./globals.css";

export const metadata = {
  title: "Trabahanap Admin Dashboard",
  description: "Admin Portal for Trabahanap App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#F8FAFC", margin: 0, minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
