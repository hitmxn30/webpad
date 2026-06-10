import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webpad",
  description: "In-browser HTML/CSS/JS playground",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-950 text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
