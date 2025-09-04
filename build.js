// build.js
import StyleDictionary from 'style-dictionary';
import fs from 'node:fs';
import path from 'node:path';
import tinycolor from 'tinycolor2';

// ---------- Helpers ----------
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Token Studio sometimes uses "$type/$value", sometimes "type/value"
function normalizeToken(token) {
  if (!token) return token;
  if ('$value' in token || '$type' in token) return token;
  if ('value' in token || 'type' in token) {
    const t = { ...token };
    if ('value' in t) { t.$value = t.value; delete t.value; }
    if ('type' in t) { t.$type = t.type; delete t.type; }
    return t;
  }
  return token;
}

// Convert any hex/rgb/etc. to hex8 for Flutter
function toHex8(color) {
  const tc = tinycolor(color);
  // Flutter expects AARRGGBB; Tinycolor toHex8 returns RRGGBBAA
  const hex8 = tc.toHex8().toUpperCase(); // RRGGBBAA
  const rrggbb = hex8.slice(0, 6);
  const aa = hex8.slice(6, 8);
  return `0x${aa}${rrggbb}`;
}

function toCssVarName(pathArr) {
  return `--${pathArr.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}

function toDartIdentifier(pathArr) {
  let name = pathArr.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(name)) name = '_' + name;
  return name;
}

// Extract leaf tokens (recursively), normalizing $type/$value
function flattenTokens(obj, pathArr = []) {
  const out = [];
  for (const key of Object.keys(obj)) {
    const node = obj[key];
    if (isObject(node) && ('$value' in node || 'value' in node || '$type' in node || 'type' in node)) {
      const t = normalizeToken(node);
      out.push({
        path: [...pathArr, key],
        type: t.$type,
        value: t.$value
      });
    } else if (isObject(node)) {
      out.push(...flattenTokens(node, [...pathArr, key]));
    }
  }
  return out;
}

// ---------- Load tokens ----------
const TOKENS_PATH = path.resolve('tokens/tokens.json');
if (!fs.existsSync(TOKENS_PATH)) {
  console.error('Missing tokens/tokens.json');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
const allTokens = flattenTokens(raw);

// ---------- CSS output ----------
function buildCss(tokens, outFile) {
  const lines = [':root {'];
  for (const t of tokens) {
    const varName = toCssVarName(t.path);
    let cssVal = t.value;

    if (t.type === 'color') {
      // Ensure css-compatible color string
      cssVal = tinycolor(t.value).toRgbString(); // e.g. "rgb(79,70,229)"
    } else if (t.type === 'dimension') {
      // Keep units if present; if unitless number is given, default to px
      cssVal = String(t.value);
      if (/^\d+(\.\d+)?$/.test(cssVal)) cssVal += 'px';
    }
    lines.push(`  ${varName}: ${cssVal};`);
  }
  lines.push('}');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
  console.log('✓ CSS written to', outFile);
}

// ---------- Flutter (Dart) output ----------
function buildDart(tokens, outFile) {
  const colorLines = [];
  const doubleLines = [];
  const stringLines = [];
  const intLines = [];

  for (const t of tokens) {
    const id = toDartIdentifier(t.path);
    const type = t.type;
    const v = String(t.value);

    if (type === 'color') {
      const hex = toHex8(v); // 0xAARRGGBB
      colorLines.push(`  static const Color ${id} = Color(${hex});`);
    } else if (type === 'dimension') {
      // turn "12px" -> 12.0, "1.5rem" -> 1.5 (still double)
      const match = v.match(/^(-?\d+(\.\d+)?)/);
      const num = match ? parseFloat(match[1]) : Number(v);
      doubleLines.push(`  static const double ${id} = ${Number.isFinite(num) ? num.toFixed(2) : 0};`);
    } else if (type === 'fontFamily') {
      stringLines.push(`  static const String ${id} = ${JSON.stringify(v)};`);
    } else if (type === 'fontWeight') {
      // weights are typically 100..900; keep as int
      const num = parseInt(v, 10);
      intLines.push(`  static const int ${id} = ${Number.isFinite(num) ? num : 400};`);
    } else {
      // default: string
      stringLines.push(`  static const String ${id} = ${JSON.stringify(v)};`);
    }
  }

  const dart = `// GENERATED FILE. Do not edit by hand.
// Source: tokens/tokens.json

import 'package:flutter/material.dart';

class AppTokens {
${colorLines.join('\n')}
${doubleLines.join('\n')}
${intLines.join('\n')}
${stringLines.join('\n')}
}
`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, dart, 'utf8');
  console.log('✓ Dart written to', outFile);
}

// ---------- Run once or watch ----------
const outCss = path.resolve('web/tokens.css');
const outDart = path.resolve('flutter/tokens.dart');

function buildAll() {
  buildCss(allTokens, outCss);
  buildDart(allTokens, outDart);
}

if (process.argv.includes('--watch')) {
  console.log('Watching tokens/tokens.json…');
  buildAll();
  fs.watchFile(TOKENS_PATH, { interval: 500 }, () => {
    console.log('\nChange detected, rebuilding…');
    const raw2 = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    const tokens2 = flattenTokens(raw2);
    buildCss(tokens2, outCss);
    buildDart(tokens2, outDart);
  });
} else {
  buildAll();
}
