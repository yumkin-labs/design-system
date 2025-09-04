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

Web (CSS Variables)
```css
@import "./tokens.css";

.button {
  background: var(--color-brand-primary);
  padding: var(--size-spacing-sm);
}
```

Flutter
```dart
import 'tokens.dart';

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