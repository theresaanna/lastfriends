#!/usr/bin/env node
// Security Audit Script - Scans for potential hardcoded secrets and tokens
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Patterns to detect potential secrets and tokens
const secretPatterns = [
  {
    name: 'JWT Token',
    pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    severity: 'HIGH'
  },
  {
    name: 'Spotify Access Token',
    pattern: /BQ[A-Za-z0-9_-]{100,}/g,
    severity: 'HIGH'
  },
  {
    name: 'Spotify Refresh Token',
    pattern: /AQ[A-Za-z0-9_-]{50,}/g,
    severity: 'HIGH'
  },
  {
    name: 'Generic API Key',
    pattern: /['\"`]([A-Za-z0-9_-]{32,})['\"`]/g,
    severity: 'MEDIUM'
  },
  {
    name: 'Base64 Secret',
    pattern: /['\"`]([A-Za-z0-9+/]{40,}={0,2})['\"`]/g,
    severity: 'MEDIUM'
  },
  {
    name: 'Hex Secret (64+ chars)',
    pattern: /['\"`]([0-9a-fA-F]{64,})['\"`]/g,
    severity: 'MEDIUM'
  },
  {
    name: 'Bearer Token',
    pattern: /Bearer\s+[A-Za-z0-9_-]+/g,
    severity: 'HIGH'
  },
  {
    name: 'Authorization Header',
    pattern: /Authorization:\s*['\"`]?[A-Za-z0-9_-]+\s+[A-Za-z0-9_-]+['\"`]?/g,
    severity: 'HIGH'
  }
];

// Files and directories to ignore
const ignorePaths = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'package-lock.json',
  '.env.local', // We know this contains secrets intentionally
  '.env',
  '.env.production',
  '.env.development',
  'security-audit.js' // Ignore this script itself
];

// File extensions to scan
const scanExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.log', '.sh'];

class SecurityAuditor {
  constructor(rootPath = '.') {
    this.rootPath = rootPath;
    this.findings = [];
  }

  shouldIgnore(filePath) {
    const relativePath = filePath.replace(this.rootPath + '/', '');
    return ignorePaths.some(ignore => 
      relativePath.includes(ignore) || 
      relativePath.startsWith(ignore + '/') ||
      relativePath === ignore
    );
  }

  shouldScan(filePath) {
    const ext = extname(filePath);
    return scanExtensions.includes(ext);
  }

  scanFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const relativePath = filePath.replace(this.rootPath + '/', '');

      secretPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.pattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const line = content.split('\n')[lineNumber - 1].trim();
          
          // Skip if this looks like a test or example
          if (this.isLikelyTest(relativePath, line)) {
            continue;
          }

          this.findings.push({
            file: relativePath,
            line: lineNumber,
            pattern: pattern.name,
            severity: pattern.severity,
            match: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
            context: line.substring(0, 100) + (line.length > 100 ? '...' : '')
          });
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }

  isLikelyTest(filePath, line) {
    const testIndicators = [
      'test-',
      'example',
      'mock',
      'demo',
      'console.log',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Common test JWT
      'node debug-jwt.js eyJ' // Our debug examples
    ];

    return testIndicators.some(indicator => 
      filePath.toLowerCase().includes(indicator) || 
      line.toLowerCase().includes(indicator)
    );
  }

  scanDirectory(dirPath) {
    try {
      const items = readdirSync(dirPath);
      
      items.forEach(item => {
        const fullPath = join(dirPath, item);
        
        if (this.shouldIgnore(fullPath)) {
          return;
        }

        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (stats.isFile() && this.shouldScan(fullPath)) {
          this.scanFile(fullPath);
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
    }
  }

  run() {
    console.log('🔍 Starting Security Audit...\n');
    console.log(`Scanning directory: ${this.rootPath}`);
    console.log(`File extensions: ${scanExtensions.join(', ')}`);
    console.log(`Ignoring: ${ignorePaths.join(', ')}\n`);

    this.scanDirectory(this.rootPath);

    this.generateReport();
  }

  generateReport() {
    console.log('=== SECURITY AUDIT REPORT ===\n');

    if (this.findings.length === 0) {
      console.log('✅ No potential secrets found in scanned files!\n');
      console.log('Note: This scan looks for common patterns. Always review');
      console.log('your code manually and ensure secrets are in environment variables.\n');
      return;
    }

    // Group by severity
    const groupedFindings = {
      HIGH: this.findings.filter(f => f.severity === 'HIGH'),
      MEDIUM: this.findings.filter(f => f.severity === 'MEDIUM'),
      LOW: this.findings.filter(f => f.severity === 'LOW')
    };

    Object.entries(groupedFindings).forEach(([severity, findings]) => {
      if (findings.length === 0) return;

      const icon = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${severity} SEVERITY (${findings.length} findings):`);
      console.log('─'.repeat(50));

      findings.forEach((finding, index) => {
        console.log(`${index + 1}. ${finding.pattern} in ${finding.file}:${finding.line}`);
        console.log(`   Match: ${finding.match}`);
        console.log(`   Context: ${finding.context}`);
        console.log();
      });
    });

    console.log('🔧 RECOMMENDATIONS:');
    console.log('─'.repeat(30));
    console.log('• Move all secrets to .env.local or environment variables');
    console.log('• Use process.env.SECRET_NAME instead of hardcoded values');
    console.log('• Add sensitive files to .gitignore');
    console.log('• Review each finding manually to confirm if it\'s a real secret');
    console.log('• Consider using a secrets management service for production\n');

    console.log(`📊 SUMMARY: Found ${this.findings.length} potential secrets across ${new Set(this.findings.map(f => f.file)).size} files`);
  }
}

// Run the audit
const auditor = new SecurityAuditor(process.cwd());
auditor.run();
