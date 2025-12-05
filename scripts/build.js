// build-tokens.js
import fs from 'fs';
import path from 'path';
import tinycolor from 'tinycolor2';

// Helper functions
const toRgb = (val) => tinycolor(val).toRgbString();
const getNumber = (v) => {
  const s = String(v);
  const m = s.match(/^(-?\d+(\.\d+)?)/);
  return m ? Number(m[0]) : Number(s);
};
const toHex8 = (val) => {
  const hex8 = tinycolor(val).toHex8().toUpperCase();
  return `0x${hex8.slice(6)}${hex8.slice(0, 6)}`;
};

// Read and preprocess the token files
const buildTokens = async () => {
  try {
    // Load all token files
    const primitives = JSON.parse(fs.readFileSync('./tokens/Primitives.json', 'utf8'));
    const semantics = JSON.parse(fs.readFileSync('./tokens/Semantics.json', 'utf8'));
    const components = JSON.parse(fs.readFileSync('./tokens/Components.json', 'utf8'));

    // Normalize tokens to use consistent format
    function normalizeTokens(obj, result = {}, path = []) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        
        // If it's a token with $value or value
        if (value && (value.$value !== undefined || value.value !== undefined)) {
          const tokenValue = value.$value !== undefined ? value.$value : value.value;
          const tokenType = value.$type !== undefined ? value.$type : value.type;
          
          // Create path-based key
          const tokenKey = currentPath.join('.');
          result[tokenKey] = {
            value: tokenValue,
            type: tokenType || inferType(tokenValue),
            path: currentPath
          };
        }
        // If it's an object without token values (a category)
        else if (value && typeof value === 'object') {
          normalizeTokens(value, result, currentPath);
        }
      }
      
      return result;
    }

    // Infer token type if not specified
    function inferType(value) {
      if (typeof value === 'string') {
        if (value.startsWith('#')) return 'color';
        if (value.includes('px') || value.includes('rem')) return 'dimension';
        if (value.match(/^[0-9]+$/)) return 'fontWeight';
      }
      return 'string';
    }

    // Create a flattened, normalized set of tokens
    const allTokens = {
      ...normalizeTokens(primitives),
      ...normalizeTokens(semantics),
      ...normalizeTokens(components)
    };

    // Resolve references in token values
    function resolveReferences(tokens) {
      const result = {};
      
      const resolveValue = (value, visited = new Set()) => {
        if (typeof value !== 'string') return value;
        
        return value.replace(/\{([^}]+)\}/g, (match, refPath) => {
          // Check for circular reference
          if (visited.has(refPath)) {
            console.warn(`Circular reference detected: ${refPath}`);
            return match;
          }
          
          const referencedToken = tokens[refPath];
          if (!referencedToken) {
            console.warn(`Reference not found: ${refPath}`);
            return match; // Keep original if reference not found
          }
          
          // Add to visited set for this resolution path
          const newVisited = new Set(visited);
          newVisited.add(refPath);
          
          // Recursively resolve nested references
          const resolvedValue = resolveValue(referencedToken.value, newVisited);
          return resolvedValue;
        });
      };

      // First pass: create a copy with resolved references
      for (const [key, token] of Object.entries(tokens)) {
        result[key] = {
          ...token,
          value: resolveValue(token.value)
        };
      }
      
      return result;
    }

    // Resolve all references (might need multiple passes for nested references)
    let resolvedTokens = allTokens;
    let previousTokens = null;
    for (let i = 0; i < 10; i++) { // Up to 10 passes to resolve nested references
      resolvedTokens = resolveReferences(resolvedTokens);
      
      // Check if we've made progress (no more references to resolve)
      const hasReferences = JSON.stringify(resolvedTokens).includes('{');
      if (!hasReferences || JSON.stringify(resolvedTokens) === JSON.stringify(previousTokens)) {
        break;
      }
      previousTokens = JSON.parse(JSON.stringify(resolvedTokens));
    }

    // Make sure output directories exist
    if (!fs.existsSync('./build/web')) {
      fs.mkdirSync('./build/web', { recursive: true });
    }
    if (!fs.existsSync('./build/flutter')) {
      fs.mkdirSync('./build/flutter', { recursive: true });
    }

    // Generate CSS variables
    const generateCssVariables = () => {
      const lines = [":root {"];
      
      for (const [tokenPath, token] of Object.entries(resolvedTokens)) {
        const nameParts = token.path;
        const kebabName = nameParts.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-");
        
        let cssValue = token.value;
        
        // Apply transforms based on type
        if (token.type === 'color') {
          cssValue = toRgb(cssValue);
        } else if (token.type === 'dimension') {
          if (/^\d+(\.\d+)?$/.test(cssValue)) {
            cssValue = `${cssValue}px`;
          }
        }
        
        lines.push(`  --${kebabName}: ${cssValue};`);
      }
      
      lines.push("}");
      fs.writeFileSync('./build/web/tokens.css', lines.join("\n") + "\n");
      console.log('✅ CSS variables generated');
    };

    // Generate Dart class
    const generateDartClass = () => {
      const colors = [];
      const doubles = [];
      const ints = [];
      const strings = [];
      
      for (const [tokenPath, token] of Object.entries(resolvedTokens)) {
        const nameParts = token.path;
        const snakeName = nameParts.join("_").replace(/[^a-zA-Z0-9_]/g, "_");
        
        if (token.type === "color") {
          colors.push(
            `  static const Color ${snakeName} = Color(${toHex8(token.value)});`
          );
        } else if (token.type === "dimension") {
          doubles.push(
            `  static const double ${snakeName} = ${getNumber(token.value)};`
          );
        } else if (token.type === "fontWeight") {
          ints.push(
            `  static const int ${snakeName} = ${parseInt(String(token.value), 10) || 400};`
          );
        } else if (typeof token.value === "string") {
          strings.push(
            `  static const String ${snakeName} = ${JSON.stringify(token.value)};`
          );
        } else {
          strings.push(
            `  static const String ${snakeName} = ${JSON.stringify(String(token.value))};`
          );
        }
      }
      
      const dartCode = `// GENERATED — DO NOT EDIT
// File: tokens.dart

import 'package:flutter/material.dart';

class AppTokens {
${colors.join("\n")}
${doubles.join("\n")}
${ints.join("\n")}
${strings.join("\n")}
}

class TokenScale {
  TokenScale._();
  static double hairline(context) => 1.0 / MediaQuery.of(context).devicePixelRatio;
}`;

      fs.writeFileSync('./build/flutter/tokens.dart', dartCode);
      console.log('✅ Dart class generated');
    };

    // Generate output files
    generateCssVariables();
    generateDartClass();
    
    console.log('✅ Design tokens built successfully!');
  } catch (error) {
    console.error('Error building tokens:', error);
    process.exit(1);
  }
};

// Run the build
buildTokens();