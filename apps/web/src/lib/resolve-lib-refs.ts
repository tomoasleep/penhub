export type LibRefResolver = (path: string) => Promise<string>;

type LibPrimitive = string | number | boolean;

interface LibVariable {
  type: "boolean" | "color" | "number" | "string";
  value: LibPrimitive | { value: LibPrimitive; theme?: Record<string, string> }[];
}

interface LibDoc {
  version: string;
  imports?: Record<string, string>;
  variables?: Record<string, LibVariable>;
  children?: unknown[];
}

type LibVariables = Record<string, LibVariable>;

interface VariableContext {
  local: LibVariables;
  imports: Map<string, LibVariables>;
}

interface VariableMatch {
  variable: LibVariable;
  scope: LibVariables;
  getter?: string;
}

function variableNames(reference: string): string[] {
  const getter = reference.match(/^([A-Za-z0-9_-]+)\((.*)\)$/);
  if (!getter) return [reference];

  const argument = getter[2].trim();
  const unquoted = argument.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  return unquoted === argument ? [argument, reference] : [unquoted, reference];
}

function findInScope(scope: LibVariables, reference: string): VariableMatch | undefined {
  const getter = reference.match(/^([A-Za-z0-9_-]+)\(.*\)$/)?.[1];
  for (const name of variableNames(reference)) {
    const variable = scope[name];
    if (variable) return { variable, scope, getter };
  }
  return undefined;
}

function isGetterCompatible(variable: LibVariable, getter: string | undefined): boolean {
  if (!getter) return true;
  if (getter === "getColor") return variable.type === "color";
  if (getter === "getSpace" || getter === "getFontSize") return variable.type === "number";
  return true;
}

function findVariable(
  reference: string,
  context: VariableContext,
  scope: LibVariables,
): VariableMatch | undefined {
  const normalized = reference.startsWith("--") ? reference.slice(2) : reference;
  const separator = normalized.indexOf(":");
  if (separator > 0) {
    const variables = context.imports.get(normalized.slice(0, separator));
    return variables ? findInScope(variables, normalized.slice(separator + 1)) : undefined;
  }

  const scopes = [scope, context.local];
  for (const imported of context.imports.values()) scopes.push(imported);
  const seen = new Set<LibVariables>();
  for (const candidate of scopes) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const match = findInScope(candidate, normalized);
    if (match) return match;
  }
  return undefined;
}

function resolveVariable(
  variable: LibVariable,
  context: VariableContext,
  scope: LibVariables,
  resolving = new Set<LibVariable>(),
): LibPrimitive | undefined {
  if (resolving.has(variable)) return undefined;
  const raw = Array.isArray(variable.value) ? variable.value[0]?.value : variable.value;
  if (typeof raw !== "string" || !raw.startsWith("$")) return raw;

  const match = findVariable(raw.slice(1), context, scope);
  if (!match || !isGetterCompatible(match.variable, match.getter)) return undefined;
  return resolveVariable(match.variable, context, match.scope, new Set(resolving).add(variable));
}

function resolveString(
  value: string,
  context: VariableContext,
  scope: LibVariables,
): LibPrimitive | string {
  if (!value.startsWith("$") || value.startsWith("$--")) return value;
  if (Object.hasOwn(context.local, value.slice(1))) return value;
  const match = findVariable(value.slice(1), context, scope);
  if (!match || !isGetterCompatible(match.variable, match.getter)) return value;
  const resolved = resolveVariable(match.variable, context, match.scope);
  return resolved === undefined ? value : resolved;
}

function walk(value: unknown, context: VariableContext, scope: LibVariables): unknown {
  if (typeof value === "string") return resolveString(value, context, scope);
  if (Array.isArray(value)) return value.map((v) => walk(v, context, scope));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, context, scope);
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
  const imports = doc.imports ?? {};
  if (Object.keys(imports).length === 0) return content;
  const importedVariables = new Map<string, LibVariables>();

  const dir = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/") + 1) : "";
  for (const [alias, uri] of Object.entries(imports)) {
    const libContent = await readFile(normalizePath(dir + uri));
    const libDoc = JSON.parse(libContent) as LibDoc;
    importedVariables.set(alias, libDoc.variables ?? {});
  }

  const localVariables = doc.variables ?? {};
  const context: VariableContext = { local: localVariables, imports: importedVariables };
  const resolved = walk(doc, context, localVariables);
  return JSON.stringify(resolved);
}
