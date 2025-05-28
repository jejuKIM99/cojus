#!/usr/bin/env node
// src/index.js (ESM mode with CommonJS-compatible enquirer import)

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import enquirer from 'enquirer';
import inquirer from 'inquirer';

const { AutoComplete, MultiSelect } = enquirer;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.resolve(__dirname, '../data/api_posts.json');
const VERSIONS_DIR = path.resolve(__dirname, '../data/versions');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const CLI_VERSION = packageJson.version;

function loadData() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(chalk.red('Error: data/api_posts.json file not found.'));
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('Invalid JSON structure');
    return arr;
  } catch (err) {
    console.error(chalk.red(`Error: JSON parsing failed → ${err.message}`));
    process.exit(1);
  }
}

function loadVersionsMap() {
  const map = new Map();
  if (!fs.existsSync(VERSIONS_DIR)) return map;
  const files = fs.readdirSync(VERSIONS_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const postId = parseInt(path.basename(file, '.json'), 10);
    try {
      const raw = fs.readFileSync(path.join(VERSIONS_DIR, file), 'utf-8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) map.set(postId, arr);
    } catch {
      // skip invalid
    }
  }
  return map;
}

/**
 * Extracts package names from an npm install command, stripping any version tags.
 * Handles scoped packages and versioned specs (pkg@version).
 */
function extractPackageNames(npmCommand) {
  const parts = npmCommand.trim().split(/\s+/);
  const installIndex = parts.indexOf('install');
  if (installIndex === -1 || installIndex === parts.length - 1) {
    return [];
  }
  return parts.slice(installIndex + 1).map(spec => {
    const atIdx = spec.lastIndexOf('@');
    if (atIdx > 0) {
      return spec.slice(0, atIdx);
    }
    return spec;
  });
}

program
  .name('cojus')
  .description('CLI tool to help install and uninstall APIs by document number')
  .version(CLI_VERSION, '-v, --version', 'Output version information')
  .allowUnknownOption(true);

program.parse(process.argv);
const args = process.argv.slice(2);

(async () => {
  const data = loadData();
  const versionsMap = loadVersionsMap();
  const mapById = new Map(data.map(item => [item.id, item]));

  if (args.includes('-help')) {
    console.log(chalk.cyan('cojus CLI Help'));
    console.log(chalk.cyan('-------------'));
    console.log('Usage:');
    console.log('  npx cojus -<doc_number> [-<doc_number> ...]    Install APIs by document number');
    console.log('  npx cojus -del                                Uninstall installed libraries');
    console.log('  npx cojus -list                               List all APIs in api_posts.json');
    console.log('  npx cojus -search                             Search and install via TUI');
    console.log('  npx cojus -v, --version                       Show version information');
    console.log('  npx cojus -help                               Show this help message');
    process.exit(0);
  }

  if (args.includes('-list')) {
    console.log(chalk.cyan('Available APIs in api_posts.json'));
    console.log(chalk.cyan('-------------------------------'));
    const tableData = data.map(item => ({
      ID: item.id,
      Title: item.title,
      'NPM Command': item.npm_command
    }));
    console.table(tableData);
    process.exit(0);
  }

  if (args.includes('-search')) {
    let selectedApi = null;
    while (!selectedApi) {
      try {
        const searchPrompt = await enquirer.prompt({
          type: 'input',
          name: 'term',
          message: '🔍 Enter search term (or \'q\' to quit):'
        });
        const term = searchPrompt.term.toLowerCase();
        if (term === 'q') {
          console.log(chalk.yellow('Search cancelled.'));
          process.exit(0);
        }
        const matches = data.filter(item => 
          item.title.toLowerCase().includes(term) || 
          item.id.toString().includes(term)
        );
        if (matches.length === 0) {
          console.log(chalk.yellow('No matches found. Try again.'));
          continue;
        }
        console.log(chalk.cyan('Search results:'));
        const tableData = matches.map((item, index) => ({
          Number: index + 1,
          ID: item.id,
          Title: item.title,
          'NPM Command': item.npm_command
        }));
        console.table(tableData);
        console.log(chalk.cyan('Enter the number of the API to install (or \'q\' to quit). Press Ctrl+C or Esc to cancel.'));
        const selectionPrompt = await enquirer.prompt({
          type: 'input',
          name: 'number',
          message: 'Select number:'
        });
        const input = selectionPrompt.number.toLowerCase();
        if (input === 'q') {
          console.log(chalk.yellow('Selection cancelled.'));
          process.exit(0);
        }
        const num = parseInt(input, 10);
        if (isNaN(num) || num < 1 || num > matches.length) {
          console.log(chalk.red('Invalid selection. Try again.'));
          continue;
        }
        selectedApi = matches[num - 1];
      } catch (err) {
        console.log(chalk.yellow('Search cancelled by user.'));
        process.exit(0);
      }
    }
    try {
      const versions = versionsMap.get(selectedApi.id) || [
        { version_tag: 'default', npm_command: selectedApi.npm_command, is_default: true }
      ];
      let command;
      if (versions.length > 1) {
        const versionPrompt = new AutoComplete({
          name: 'verCmd',
          message: `Choose version for ${selectedApi.title}`,
          choices: versions.map(v => ({ name: `${v.version_tag}${v.is_default ? ' (default)' : ''}`, value: v.npm_command }))
        });
        command = await versionPrompt.run(); // 직접 value를 반환
        if (!command) {
          console.log(chalk.yellow('Version selection cancelled.'));
          process.exit(0);
        }
      } else {
        command = versions[0].npm_command;
      }
      if (!command || typeof command !== 'string') {
        console.error(chalk.red('Error: Invalid NPM command selected.'));
        process.exit(1);
      }
      console.log(chalk.cyan(`→ Installing: ${command}`));
      await new Promise((resolve, reject) => {
        exec(command, { shell: true }, (err) => {
          if (err) {
            console.error(chalk.red(`Installation failed: ${err.message}`));
            reject(err);
          } else {
            resolve();
          }
        });
      });
      console.log(chalk.green('✅ Installation complete.'));
    } catch (err) {
      if (err === '') {
        console.log(chalk.yellow('Version selection cancelled.'));
      } else {
        console.error(chalk.red(`Error during installation: ${err.message}`));
      }
      process.exit(1);
    }
    process.exit(0);
  }

  if (args.includes('-del')) {
    let installedNames = [];
    try {
      const json = execSync('npm list --depth=0 --json').toString();
      const parsed = JSON.parse(json);
      installedNames = parsed.dependencies ? Object.keys(parsed.dependencies) : [];
    } catch {
      console.error(chalk.red('Error: Failed to load installed package list.'));
      process.exit(1);
    }
    const itemsWithPkgs = data.map(item => ({ ...item, pkgNames: extractPackageNames(item.npm_command) }));
    const installedItems = itemsWithPkgs.filter(item => item.pkgNames.some(pkg => installedNames.includes(pkg)));
    if (installedItems.length === 0) {
      console.log(chalk.yellow('No installed libraries found.'));
      process.exit(0);
    }
    const choices = installedItems.map(item => ({ name: `${item.title} (${item.pkgNames.join(', ')})`, value: item.pkgNames }));
    choices.unshift({ name: 'all', value: 'all' });
    const answers = await inquirer.prompt([{ type: 'checkbox', name: 'toRemove', message: 'Select libraries to uninstall', choices, validate: sel => sel.length > 0 || 'At least one library must be selected.' }]);
    let targets = answers.toRemove;
    if (targets.includes('all')) {
      targets = installedItems.flatMap(item => item.pkgNames);
    } else {
      targets = targets.flat();
    }
    targets = [...new Set(targets)];
    for (const pkg of targets) {
      console.log(chalk.cyan(`→ Uninstalling ${pkg}...`));
      await new Promise(resolve => exec(`npm uninstall ${pkg}`, { shell: true }, () => resolve()));
      console.log(chalk.magenta(`${pkg} uninstalled.`));
    }
    console.log(chalk.green('All uninstallation tasks completed.'));
    process.exit(0);
  }

  if (args.length === 0) {
    console.error(chalk.yellow('Usage: cojus -<doc_number> [-<doc_number> ...]'));
    process.exit(1);
  }

  const docIds = args
    .map(arg => (arg.startsWith('-') ? parseInt(arg.substring(1), 10) : null))
    .filter(x => x !== null);
  if (docIds.length === 0) {
    console.error(chalk.red('Invalid input. Example: cojus -101 -102'));
    process.exit(1);
  }

  for (const id of docIds) {
    const item = mapById.get(id);
    if (!item) {
      console.error(chalk.red(`Error: No data found for ID ${id}.`));
      continue;
    }
    const versions = versionsMap.get(id) || [];
    let command = item.npm_command;
    if (versions.length > 0) {
      const defaultVer = versions.find(v => v.is_default) || versions[0];
      command = defaultVer.npm_command;
    }
    console.log(chalk.cyan(`→ [ID ${id} | ${item.title}] Installing: ${command}`));
    await new Promise(resolve => exec(command, { shell: true }, () => resolve()));
    console.log(chalk.green(`${item.title} installed.`));
  }
  console.log(chalk.green('All installation tasks completed successfully.'));
})();