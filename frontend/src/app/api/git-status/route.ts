import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

// Force dynamic execution to prevent compile-time static page pre-caching under next start
export const dynamic = "force-dynamic";

export async function GET() {
  const targetPath = process.env.TRACKED_PROJECT_PATH;

  // 1. Check if path is unconfigured or empty
  if (!targetPath || targetPath.trim() === "") {
    return NextResponse.json({ state: "unconfigured" });
  }

  // 2. Check if configured directory exists on disk
  if (!fs.existsSync(targetPath)) {
    return NextResponse.json({ state: "invalid-path", path: targetPath });
  }

  try {
    // 3. Asynchronously run command in the target project's working directory
    const { stdout } = await execAsync("git rev-parse --is-inside-work-tree", {
      cwd: targetPath,
    });
    
    if (stdout.trim() === "true") {
      return NextResponse.json({ state: "connected", path: targetPath });
    }
    
    return NextResponse.json({ state: "disconnected", path: targetPath });
  } catch (e) {
    // 4. Handles failures (not inside a work tree, git not installed, process errors)
    return NextResponse.json({ state: "disconnected", path: targetPath });
  }
}
