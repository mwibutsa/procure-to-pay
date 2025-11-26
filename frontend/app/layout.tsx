import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import StyledComponentsRegistry from "@/lib/AntdRegistry";
import { FC, ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Procure-to-Pay System",
  description: "Purchase Request & Approval System",
};

const RootLayout: FC<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
};

export default RootLayout;
