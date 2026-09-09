export type LibRefResolver = (path: string) => Promise<string>;

interface LibVariable {
  type: "color" | "number" | "string";
  value: string | number | { value: string | number; theme?: Record<string, string> }[];
}

interface LibDoc {
  version: string;
  variables?: Record<string, LibVariable>;
  children: unknown[];
}

const LIB_REF_RE = /^\$([A-Za-z0-9_-]+):(get[A-Za-z0-9]*)\(("([^"]*)"|'([^']*)'|(\d+))\)$/;

function resolveValue(variable: LibVariable | undefined, fn: string): string | number | undefined {
  if (!variable) return undefined;
  const raw = Array.isArray(variable.value) ? variable.value[0]?.value : variable.value;
  if (fn === "getColor") {
    return variable.type === "color" && typeof raw === "string" ? raw : undefined;
  }
  if (variable.type === "number") return typeof raw === "number" ? raw : undefined;
  if (variable.type === "color" || variable.type === "string") {
    return typeof raw === "string" ? raw : undefined;
  }
  return undefined;
}

function resolveString(
  value: string,
  libs: Map<string, Record<string, LibVariable>>,
): string | number {
  const m = value.match(LIB_REF_RE);
  if (!m) return value;
  const [, alias, fn, , q1, q2, num] = m;
  const variables = libs.get(alias);
  if (!variables) return value;
  const name = num !== undefined ? num : q1 ?? q2;
  const resolved = resolveValue(variables[name], fn);
  return resolved === undefined ? value : resolved;
}

function walk(value: unknown, libs: Map<string, Record<string, LibVariable>>): unknown {
  if (typeof value === "string") return resolveString(value, libs);
  if (Array.isArray(value)) return value.map((v) => walk(v, libs));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, libs);
    return out;
  }
  return value;
}

function normalizePath(path: string): string {
  const parts = path.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

export async function resolveLibRefs(
  content: string,
  filePath: string,
  _sourceId: string,
  readFile: LibRefResolver,
): Promise<string> {
  const doc = JSON.parse(content) as LibDoc;
  const imports = (doc as { imports?: Record<string, string> }).imports;
  if (!imports || Object.keys(imports).length === 0) return content;

  const dir = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/") + 1) : "";
  const libs = new Map<string, Record<string, LibVariable>>();
  for (const [alias, uri] of Object.entries(imports)) {
    const libContent = await readFile(normalizePath(dir + uri));
    const libDoc = JSON.parse(libContent) as LibDoc;
    libs.set(alias, libDoc.variables ?? {});
  }

  const resolved = walk(doc, libs);
  return JSON.stringify(resolved);
}
