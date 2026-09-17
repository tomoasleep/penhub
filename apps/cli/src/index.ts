#!/usr/bin/env node
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { renderPenToPng } from "./render.js";

interface CliArgs {
  file?: string;
  output?: string;
  scale?: number;
  page?: string;
  help: boolean;
}

const HELP = `penhub-render: pen ファイルを PNG にレンダリングします

使い方:
  penhub-render <file.pen> [options]

オプション:
  -o, --output <path>  出力ファイルパス (省略時は入力ファイル名 + .png)
  -s, --scale <n>      倍率 (デフォルト: 1)
  -p, --page <name|n>  レンダリングするページ名またはインデックス (省略時は先頭ページ)
  -h, --help           このヘルプを表示
`;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      args.help = true;
    } else if (arg === "-o" || arg === "--output") {
      args.output = argv[++i];
    } else if (arg === "-s" || arg === "--scale") {
      args.scale = Number(argv[++i]);
    } else if (arg === "-p" || arg === "--page") {
      args.page = argv[++i];
    } else if (arg.startsWith("-")) {
      throw new Error(`不明なオプション: ${arg}`);
    } else if (!args.file) {
      args.file = arg;
    } else {
      throw new Error(`予期しない引数: ${arg}`);
    }
  }
  return args;
}

function defaultOutput(file: string): string {
  const dot = file.lastIndexOf(".");
  return dot > 0 ? `${file.slice(0, dot)}.png` : `${file}.png`;
}

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  if (args.help || !args.file) {
    console.log(HELP);
    if (!args.help) process.exit(1);
    return;
  }

  const input = resolve(args.file);
  const output = resolve(args.output ?? defaultOutput(args.file));
  try {
    const png = await renderPenToPng(input, { scale: args.scale, page: args.page });
    await writeFile(output, png);
    console.log(`レンダリング完了: ${output}`);
  } catch (e) {
    console.error(`エラー: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

main();
