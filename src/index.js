#!/usr/bin/env node
// src/index.js (ESM mode: filtering by npm package name for deletion, installation, and TUI search)

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fuzzy from 'fuzzy';

// Create __dirname in ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file paths
const DATA_PATH = path.resolve(__dirname, '../data/api_posts.json');
const VERSIONS_DIR = path.resolve(__dirname, '../data/versions');

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

function extractPackageNames(npmCommand) {
  const parts = npmCommand.trim().split(' ');
  const installIndex = parts.indexOf('install');
  if (installIndex === -1 || installIndex === parts.length - 1) {
    return [];
  }
  return parts.slice(installIndex + 1);
}

program
  .name('cojus')
  .description('CLI tool to help install and uninstall APIs by document number')
  .version('0.1.5', '-v, --version', 'Output version information')
  .allowUnknownOption(true);

program.parse(process.argv);
const args = process.argv.slice(2);

(async () => {
  const data = loadData();
  const versionsMap = loadVersionsMap();
  const mapById = new Map(data.map(item => [item.id, item]));

  // Help mode
  if (args.includes('-help')) {
    console.log(chalk.cyan('cojus CLI Help'));
    console.log(chalk.cyan('-------------'));
    console.log('Usage:');
    console.log('  npx cojus -<doc_number> [-<doc_number> ...]    Install APIs by document number');
    console.log('  npx cojus -del                                 Uninstall installed libraries');
    console.log('  npx cojus -list                                List all APIs in api_posts.json');
    console.log('  npx cojus -search                              Search and install via TUI');
    console.log('  npx cojus -v, --version                        Show version information');
    console.log('  npx cojus -help                                Show this help message');
    process.exit(0);
  }

  // List mode
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

  // Search (TUI) mode
  if (args.includes('-search')) {
    // 1) 검색어 입력
    const { term } = await inquirer.prompt([{ type: 'input', name: 'term', message: 'Search for package:' }]);
    // 2) fuzzy 매칭
    const titles = data.map(item => item.title);
    const fuzzyResult = fuzzy.filter(term, titles).map(el => el.original);
    const matches = data.filter(item => fuzzyResult.includes(item.title));
    if (matches.length === 0) {
      console.log(chalk.yellow('No matches found.'));
      process.exit(0);
    }
    // 3) 선택
    const choices = matches.map(item => ({ name: `${item.title} [ID ${item.id}]`, value: item.id }));
    const { selectedIds } = await inquirer.prompt([{ type: 'checkbox', name: 'selectedIds', message: 'Select packages to install', choices }]);
    // 4) 설치
    for (const id of selectedIds) {
      const post = mapById.get(id);
      const versions = versionsMap.get(id) || [];
      let command = post.npm_command;
      if (versions.length > 0) {
        // 버전 선택
        const verChoices = versions.map(v => ({ name: v.version_tag + (v.is_default ? ' (default)' : ''), value: v.npm_command }));
        const { verCmd } = await inquirer.prompt([{ type: 'list', name: 'verCmd', message: `Choose version for ${post.title}`, choices: verChoices }]);
        command = verCmd;
      }
      console.log(chalk.cyan(`→ Installing: ${command}`));
      await new Promise(resolve => exec(command, { shell: true }, () => resolve()));
      console.log(chalk.green(`${post.title} installed.`));
    }
    process.exit(0);
  }

  // Delete mode
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
    if (targets.includes('all')) targets = installedItems.flatMap(item => item.pkgNames);
    targets = [...new Set(targets)];
    for (const pkg of targets) {
      console.log(chalk.cyan(`→ Uninstalling ${pkg}...`));
      await new Promise(resolve => exec(`npm uninstall ${pkg}`, { shell: true }, () => resolve()));
      console.log(chalk.magenta(`${pkg} uninstalled.`));
    }
    console.log(chalk.green('All uninstallation tasks completed.'));
    process.exit(0);
  }

  // Install mode
  if (args.length === 0) {
    console.error(chalk.yellow('Usage: cojus -<doc_number> [-<doc_number> ...]'));
    process.exit(1);
  }
  const docIds = args.map(arg => arg.startsWith('-') ? parseInt(arg.substring(1), 10) : null).filter(x => x !== null);
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
      // 기본(default) 버전 설치
      const defaultVer = versions.find(v => v.is_default) || versions[0];
      command = defaultVer.npm_command;
    }
    console.log(chalk.cyan(`→ [ID ${id} | ${item.title}] Installing: ${command}`));
    await new Promise(resolve => exec(command, { shell: true }, () => resolve()));
    console.log(chalk.green(`${item.title} installed.`));
  }
  console.log(chalk.green('All installation tasks completed successfully.'));
})();
