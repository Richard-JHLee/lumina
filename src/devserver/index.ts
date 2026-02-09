// ============================================================
// Lumina Language - Dev Server
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { CodeGenerator } from '../codegen';

export interface DevServerOptions {
  port?: number;
  watch?: string[];  // Directories to watch
  output?: string;   // Output directory
}

export class DevServer {
  private port: number;
  private watchDirs: string[];
  private outputDir: string;
  private watchers: fs.FSWatcher[] = [];
  private server?: http.Server;

  constructor(options: DevServerOptions = {}) {
    this.port = options.port || 3000;
    this.watchDirs = options.watch || ['examples'];
    this.outputDir = options.output || 'output';
  }

  start(): void {
    console.log('🚀 Lumina Dev Server starting...\n');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Start file watcher
    this.startWatching();

    // Start HTTP server
    this.startHttpServer();

    console.log(`✅ Dev Server running at http://localhost:${this.port}`);
    console.log(`📁 Serving files from: ${path.resolve(this.outputDir)}`);
    console.log(`👀 Watching: ${this.watchDirs.join(', ')}\n`);
    console.log('Press Ctrl+C to stop\n');
  }

  stop(): void {
    console.log('\n🛑 Stopping Dev Server...');

    // Close watchers
    this.watchers.forEach(watcher => watcher.close());

    // Close HTTP server
    if (this.server) {
      this.server.close();
    }

    console.log('✅ Dev Server stopped');
  }

  private startWatching(): void {
    for (const dir of this.watchDirs) {
      if (!fs.existsSync(dir)) {
        console.warn(`⚠️  Directory not found: ${dir}`);
        continue;
      }

      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.lum')) return;

        const filePath = path.join(dir, filename);
        console.log(`\n📝 File changed: ${filePath}`);
        this.compileFile(filePath);
      });

      this.watchers.push(watcher);
      console.log(`👀 Watching: ${dir}`);
    }

    // Initial compilation of all .lum files
    console.log('\n🔨 Initial compilation...');
    this.compileAll();
  }

  private compileAll(): void {
    for (const dir of this.watchDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.lum')) {
          const filePath = path.join(dir, file);
          this.compileFile(filePath, false);
        }
      }
    }
    console.log('✅ Initial compilation complete\n');
  }

  private compileFile(filePath: string, verbose: boolean = true): void {
    try {
      const startTime = Date.now();

      // Read source file
      const source = fs.readFileSync(filePath, 'utf-8');

      // Compile
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const codegen = new CodeGenerator();
      const { html } = codegen.generate(ast);

      // Write output
      const baseName = path.basename(filePath, '.lum');
      const outputPath = path.join(this.outputDir, `${baseName}.html`);
      fs.writeFileSync(outputPath, html, 'utf-8');

      const duration = Date.now() - startTime;

      if (verbose) {
        console.log(`✅ Compiled: ${filePath} → ${outputPath} (${duration}ms)`);
      }
    } catch (error: any) {
      console.error(`❌ Compilation Error: ${filePath}`);
      console.error(error.message);
    }
  }

  private startHttpServer(): void {
    this.server = http.createServer((req, res) => {
      let filePath = '.' + req.url;

      // Default to index.html
      if (filePath === './') {
        filePath = './index.html';
      }

      // Serve from output directory
      filePath = path.join(this.outputDir, path.basename(filePath));

      const extname = String(path.extname(filePath)).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };

      const contentType = mimeTypes[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            // File not found - show directory listing
            this.sendDirectoryListing(res);
          } else {
            res.writeHead(500);
            res.end(`Server Error: ${error.code}`);
          }
        } else {
          // Inject live reload script for HTML files
          if (extname === '.html') {
            content = Buffer.from(
              content.toString().replace(
                '</body>',
                `<script>
                  // Simple polling-based live reload
                  let lastModified = null;
                  setInterval(async () => {
                    try {
                      const response = await fetch(window.location.href, { method: 'HEAD' });
                      const modified = response.headers.get('last-modified');
                      if (lastModified && modified !== lastModified) {
                        console.log('🔄 File changed, reloading...');
                        window.location.reload();
                      }
                      lastModified = modified;
                    } catch (e) {}
                  }, 1000);
                </script>
                </body>`
              )
            );
          }

          res.writeHead(200, {
            'Content-Type': contentType,
            'Last-Modified': fs.statSync(filePath).mtime.toUTCString()
          });
          res.end(content, 'utf-8');
        }
      });
    });

    this.server.listen(this.port);
  }

  private sendDirectoryListing(res: http.ServerResponse): void {
    try {
      const files = fs.readdirSync(this.outputDir)
        .filter(f => f.endsWith('.html'))
        .map(f => `<li><a href="${f}">${f}</a></li>`)
        .join('\n');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lumina Dev Server</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    h1 { color: #3b82f6; }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; }
    a {
      color: #3b82f6;
      text-decoration: none;
      font-size: 18px;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🌟 Lumina Dev Server</h1>
  <p>Available files:</p>
  <ul>${files}</ul>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      res.writeHead(500);
      res.end('Error reading directory');
    }
  }
}

export default DevServer;
