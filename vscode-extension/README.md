# Lumina Language Support for VS Code

Syntax highlighting and language support for the Lumina programming language.

## Features

- 🎨 **Syntax Highlighting** - Full syntax highlighting for `.lum` files
- 🔧 **Auto-closing** - Automatic closing of brackets, quotes, and tags
- 💡 **Comment Toggle** - Use `Cmd+/` to toggle line/block comments
- 📦 **Bracket Matching** - Matching brackets and tag pairs

## Installation

### From VSIX (Local)

1. Open VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Install from VSIX" and select `Extensions: Install from VSIX...`
4. Navigate to the `.vsix` file and install

### From Source

```bash
cd vscode-extension
npm install -g @vscode/vsce
vsce package
code --install-extension lumina-0.2.0.vsix
```

## Usage

Simply open any `.lum` file and syntax highlighting will be applied automatically!

## Syntax Examples

### Keywords
`component`, `fn`, `let`, `var`, `state`, `effect`, `style`, `if`, `else`, `for`, `return`, `import`, `export`

### Components
```lumina
component Counter() {
  state count = 0
  <div>{count}</div>
}
```

### Events
```lumina
<button @click={increment}>Click</button>
```

### Styles
```lumina
style buttonStyle {
  padding: 12
  background: "#3b82f6"
}
```

## Support

- **Issues**: https://github.com/Richard-JHLee/lumina/issues
- **Docs**: https://github.com/Richard-JHLee/lumina

## License

MIT License
