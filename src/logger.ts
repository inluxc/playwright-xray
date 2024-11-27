import { blue, bold, green, red, white, yellow, cyan } from "picocolors";

class CustomLogger {
  log(...args: unknown[]) {
    console.log(cyan("[INFO]"), ...args);
  }

  warn(...args: unknown[]) {
    console.log(yellow("[WARN]"), ...args);
  }

  error(...args: unknown[]) {
    console.log(red("[ERROR]"), ...args);
  }

  logEmptyLine() {
    console.log("\n\n");
  }

  separator() {
    console.log(`${bold(blue(" "))}`);
    console.log(`${bold(blue("-------------------------------------"))}`);
    console.log(`${bold(blue(" "))}`);
  }

  info(message: string) {
    console.log(`${bold(yellow("⏺  "))}${bold(blue(message))}`);
  }

  sucess(message: string) {
    console.log(`${bold(green("✔  "))}${bold(blue(message))}`);
  }
}

export const logger = new CustomLogger();
