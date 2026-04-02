import type { NextConfig } from "next";
import { execSync } from "child_process";

function getGitVersion(): string {
  try {
    return execSync("git describe --tags --abbrev=0", { encoding: "utf-8" }).trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["voyageai"],
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: getGitVersion(),
  },
};

export default nextConfig;
