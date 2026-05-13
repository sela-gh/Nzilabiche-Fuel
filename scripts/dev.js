import { spawn } from "node:child_process";

const commands = [
  ["Backend", "node", ["server/index.js"], false],
  ["Frontend", "npm.cmd", ["exec", "vite", "--", "--host", "127.0.0.1"], process.platform === "win32"]
];

const children = commands.map(([label, command, args, useShell]) => {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: useShell
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.exitCode = code;
    }
  });

  return child;
});

const shutdown = () => {
  for (const child of children) {
    child.kill();
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
