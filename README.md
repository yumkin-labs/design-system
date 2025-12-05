# 🎨 Design Tokens Pipeline (Token Studio → Web + Flutter)

This project provides a simple pipeline to transform [Figma Token Studio](https://docs.tokens.studio/) exports (JSON) into **design tokens usable across Web and Flutter**.

- **Input**: Token Studio JSON (`tokens/tokens.json`)
- **Outputs**:
  - **Web** → `web/tokens.css` with `:root { --var: value; }`
  - **Flutter** → `flutter/tokens.dart` with `const` values for `Color`, `double`, `int`, `String`

---

## 🚀 Getting Started

### 1. Install

```bash
pnpm install
```

### 2. Place your token export

Export from Token Studio and save as:

```bash
tokens/tokens.json
```

Example

```json
{
  "color": {
    "brand": {
      "primary": { "$type": "color", "$value": "#4F46E5" }
    }
  },
  "size": {
    "spacing": {
      "sm": { "$type": "dimension", "$value": "8px" }
    }
  }
}
```

### 3. Build Tokens

```bash
pnpm run build
```

or (auto-rebuild on changes)

```bash
npm run watch
```

This generates:

- Web → `web/tokens.css`
- Flutter → `flutter/tokens.dart`

## 📦 Usage

### Installing as npm Package

```bash
npm install yumkin-design-tokens
# or
pnpm add yumkin-design-tokens
# or
yarn add yumkin-design-tokens
```

### Web (CSS Variables)

**Option 1: Import via npm package**
```css
@import "yumkin-design-tokens/web";

.button {
  background: var(--color-brand-primary);
  padding: var(--size-spacing-sm);
}
```

**Option 2: Direct file import**
```css
@import "yumkin-design-tokens/build/web/tokens.css";

.button {
  background: var(--color-brand-primary);
  padding: var(--size-spacing-sm);
}
```

**Option 3: Copy file to your project**
```bash
cp node_modules/yumkin-design-tokens/build/web/tokens.css ./src/styles/
```

### Flutter

**Option 1: Copy file to your Flutter project**
```bash
cp node_modules/yumkin-design-tokens/build/flutter/tokens.dart ./lib/tokens/
```

**Option 2: Use as dependency (if using pubspec.yaml)**
Add the file path to your `pubspec.yaml` assets, or copy it manually.

Then use in your Dart code:
```dart
import 'package:your_app/tokens/tokens.dart';

Container(
  color: AppTokens.color_brand_primary,
  padding: EdgeInsets.all(AppTokens.size_spacing_sm),
);
```

## 📐 Flutter & Device Pixels

All spacing, radii, and font sizes are emitted as logical pixels (dp), which automatically scale with devicePixelRatio.

For hairline borders (1 physical pixel), use a helper:

```dart
import 'package:flutter/widgets.dart';

class TokenScale {
  static double hairline(BuildContext context) =>
      1.0 / MediaQuery.of(context).devicePixelRatio;
}

Divider(thickness: TokenScale.hairline(context));
```

### 🛠️ Token Types Supported

- `color` → Color(...) in Flutter, rgb(...) in CSS
- `dimension` → double in Flutter, px in CSS
- `fontFamily` → String
- `fontWeight` → int (100–900)

## 📤 Publishing to npm

### Prerequisites

1. Ensure you have an npm account: [npmjs.com](https://www.npmjs.com/)
2. Login to npm: `npm login`

### Publishing Steps

1. **Build the tokens** (this runs automatically before publish):
   ```bash
   npm run build
   ```

2. **Verify what will be published**:
   ```bash
   npm pack --dry-run
   ```
   This shows you exactly what files will be included in the package.

3. **Publish to npm**:
   ```bash
   npm publish
   ```
   
   For a scoped package (if your package name is `@yumkin/design-tokens`):
   ```bash
   npm publish --access public
   ```

4. **Update version for subsequent releases**:
   ```bash
   npm version patch  # 1.0.0 → 1.0.1
   npm version minor  # 1.0.0 → 1.1.0
   npm version major  # 1.0.0 → 2.0.0
   ```

### Package Configuration

The package is configured to:
- ✅ Include only the `build/` directory in the published package
- ✅ Automatically run `build` before publishing (via `prepublishOnly` script)
- ✅ Provide convenient export paths: `yumkin-design-tokens/web` and `yumkin-design-tokens/flutter`
