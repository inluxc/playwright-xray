type ParsedArgs = {
  flags: Record<string, string | boolean>;
  positional: string[];
};

function parseArgs(): ParsedArgs {
  const raw = process.argv.slice(2);

  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];

    if (arg.startsWith("--")) {
      const [key, value] = arg.split("=");

      if (value !== undefined) {
        flags[key.slice(2)] = value;
      } else {
        const next = raw[i + 1];
        if (next && !next.startsWith("-")) {
          flags[key.slice(2)] = next;
          i++;
        } else {
          flags[key.slice(2)] = true;
        }
      }
    } else if (arg.startsWith("-")) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// Public API for your reporter
export function getArg(name: string, options?: { default?: string }): string | boolean | undefined {
  const { flags } = parseArgs();

  // 1. CLI: --myFlag=value
  if (flags[name] !== undefined) {
    return flags[name];
  }

  // 2. npm_config_ fallback (npm run --flag=value)
  const npmValue = process.env[`npm_config_${name}`];
  if (npmValue !== undefined) {
    return npmValue;
  }

  // 3. ENV fallback (CI-friendly)
  const envValue = process.env[name.toUpperCase()];
  if (envValue !== undefined) {
    return envValue;
  }

  return options?.default;
}
