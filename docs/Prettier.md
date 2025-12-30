# Prettier Code Formatting Guide

We use [Prettier](https://prettier.io/) as our automatic code formatter to ensure consistent code style across the entire codebase. Prettier is an opinionated code formatter that enforces a consistent style by parsing your code and reprinting it with its own rules.

## Why Prettier?

- **Consistency**: Ensures all code follows the same formatting rules
- **Time-saving**: No more manual formatting or debates about code style
- **Focus on logic**: Spend time on code logic rather than formatting
- **Easy integration**: Works seamlessly with editors and version control

## Configuration

### Prettier Configuration File

Our Prettier configuration is defined in `.prettierrc` at the root of the project:

```json
{
  "semi": true,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "quoteProps": "as-needed",
  "proseWrap": "preserve",
  "endOfLine": "lf"
}
```

### Configuration Breakdown

| Option           | Value         | Description                                                    |
| ---------------- | ------------- | -------------------------------------------------------------- |
| `semi`           | `true`        | Print semicolons at the ends of statements                     |
| `singleQuote`    | `false`       | Use double quotes instead of single quotes                     |
| `jsxSingleQuote` | `false`       | Use double quotes in JSX                                       |
| `trailingComma`  | `"es5"`       | Add trailing commas where valid in ES5 (objects, arrays, etc.) |
| `printWidth`     | `100`         | Wrap lines that exceed 100 characters                          |
| `tabWidth`       | `2`           | Specify the number of spaces per indentation level             |
| `useTabs`        | `false`       | Indent with spaces instead of tabs                             |
| `bracketSpacing` | `true`        | Print spaces between brackets in object literals               |
| `arrowParens`    | `"always"`    | Always include parentheses around arrow function parameters    |
| `quoteProps`     | `"as-needed"` | Only add quotes around object properties when necessary        |
| `proseWrap`      | `"preserve"`  | Do not wrap markdown text                                      |
| `endOfLine`      | `"lf"`        | Use Line Feed only (\n), common to Linux and macOS             |

## Ignored Files

The following files and directories are excluded from Prettier formatting (`.prettierignore`):

```
node_modules
dist
build
coverage
.next
.vite
.env
.env.*
package-lock.json
pnpm-lock.yaml
yarn.lock
```

## Editor Setup

### VS Code

1. **Install Prettier Extension**:
   - Open VS Code Extensions (Ctrl+Shift+X)
   - Search for "Prettier - Code formatter"
   - Install the official Prettier extension

2. **Configure VS Code Settings**:
   Add these settings to your `.vscode/settings.json`:
   ```json
   {
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.formatOnSave": true,
     "[javascript]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     },
     "[typescript]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     },
     "[typescriptreact]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     },
     "[json]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     }
   }
   ```

### Other Editors

- **WebStorm/IntelliJ**: Enable Prettier in Settings → Languages & Frameworks → JavaScript → Prettier
- **Vim**: Use plugins like `prettier/vim-prettier`
- **Sublime Text**: Install JsPrettier package

## Usage

### Manual Formatting

While format-on-save is recommended, you can manually format files:

**VS Code**:

- Format entire file: `Shift + Alt + F` (Windows/Linux) or `Shift + Option + F` (Mac)
- Format selection: Select code, then `Ctrl + K, Ctrl + F`

**Command line** (if you have Prettier installed globally):

```bash
# Format a specific file
npx prettier --write path/to/file.ts

# Format all files in src directory
npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,md}"

# Check formatting without making changes
npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"
```

## Best Practices

### 1. Format Before Committing

Always ensure your code is formatted before committing. Enable format-on-save to automate this.

### 2. Don't Override Prettier Rules

Avoid using inline comments to disable Prettier unless absolutely necessary:

```typescript
// prettier-ignore
const matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
```

Only use this for specific cases where manual formatting is more readable.

### 3. Consistent Configuration

Do not create additional Prettier configuration files in subdirectories. Use the root configuration for the entire project.

### 4. Trust Prettier

Let Prettier handle formatting decisions. Don't try to manually format code that Prettier will reformat anyway.

## Common Issues and Solutions

### Issue: Prettier and ESLint Conflicts

**Solution**: Our project configuration ensures Prettier and ESLint work together. Prettier handles formatting, while ESLint handles code quality rules.

### Issue: Format on Save Not Working

**Solution**:

1. Check that Prettier extension is installed
2. Verify `editor.formatOnSave` is set to `true`
3. Ensure the file type is supported
4. Restart VS Code

### Issue: Different Formatting on Different Machines

**Solution**:

1. Ensure all team members use the same Prettier version
2. Verify `.prettierrc` is committed to version control
3. Check that editor settings don't override Prettier config

## Integration with Git Hooks

For future implementation, consider adding Prettier to pre-commit hooks using `husky` and `lint-staged`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,css,md}": ["prettier --write", "git add"]
  }
}
```

## Contributing

When contributing to this project:

1. ✅ Install Prettier extension in your editor
2. ✅ Enable format-on-save
3. ✅ Ensure your code is formatted before creating a pull request
4. ✅ Don't modify the `.prettierrc` configuration without team discussion
5. ✅ Follow the existing code style maintained by Prettier

## Summary

Prettier is a critical tool in our development workflow that ensures code consistency and reduces formatting-related discussions. By following these guidelines, you'll maintain the high code quality standards of the Vizuara AI Labs project.

For more information, visit the [official Prettier documentation](https://prettier.io/docs/en/index.html).
