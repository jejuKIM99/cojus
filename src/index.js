#!/usr/bin/env node
// src/index.js (ESM mode: filtering by npm package name for deletion)

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';

// Create __dirname in ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file path
const DATA_PATH = path.resolve(__dirname, '../data/api_posts.json');

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

// Function to extract package names from npm_command
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
  const data = loadData(); // [{id, npm_command, title}, ...]
  const mapById = new Map(data.map(item => [item.id, item]));

  // Help mode
  if (args.includes('-help')) {
    console.log(chalk.cyan('cojus CLI Help'));
    console.log(chalk.cyan('-------------'));
    console.log('Usage:');
    console.log('  npx cojus -<doc_number> [-<doc_number> ...]  Install APIs by document number');
    console.log('  npx cojus -del                              Uninstall installed libraries');
    console.log('  npx cojus -list                             List all APIs in api_posts.json');
    console.log('  npx cojus -v, --version                     Show version information');
    console.log('  npx cojus -help                             Show this help message');
    console.log(chalk.cyan('Examples:'));
    console.log('  npx cojus -36 -38                         Install GSAP and Swiper.js');
    console.log('  npx cojus -del                            Uninstall selected libraries');
    console.log('  npx cojus -list                           List all available APIs');
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

  // Delete mode
  if (args.includes('-del')) {
    // Load installed package list
    let installedNames = [];
    try {
      const json = execSync('npm list --depth=0 --json').toString();
      const parsed = JSON.parse(json);
      installedNames = parsed.dependencies ? Object.keys(parsed.dependencies) : [];
    } catch {
      console.error(chalk.red('Error: Failed to load installed package list.'));
      process.exit(1);
    }

    // Extract package names from api_posts.json
    const itemsWithPkgs = data.map(item => {
      const pkgNames = extractPackageNames(item.npm_command);
      return { ...item, pkgNames };
    });

    // Filter only installed packages
    const installedItems = itemsWithPkgs.filter(item => item.pkgNames.some(pkg => installedNames.includes(pkg)));
    if (installedItems.length === 0) {
      console.log(chalk.yellow('No installed libraries found.'));
      process.exit(0);
    }

    // Choices: Title (package names)
    const choices = installedItems.map(item => ({
      name: `${item.title} (${item.pkgNames.join(', ')})`,
      value: item.pkgNames
    }));
    choices.unshift({ name: 'all', value: 'all' });

    const answers = await inquirer.prompt([{
      type: 'checkbox',
      name: 'toRemove',
      message: 'Select libraries to uninstall (use spacebar to select, then press enter)',
      choices,
      validate: sel => sel.length > 0 || 'At least one library must be selected.'
    }]);

    let targets = answers.toRemove;
    if (targets.includes('all')) {
      targets = installedItems.flatMap(item => item.pkgNames);
    } else {
      targets = targets.flat();
    }

    // Remove duplicates
    targets = [...new Set(targets)];

    for (const pkg of targets) {
      console.log(chalk.cyan(`→ Uninstalling ${pkg}...`));
      await new Promise(resolve => {
        exec(`npm uninstall ${pkg}`, { shell: true }, (err, stdout, stderr) => {
          if (err) console.error(chalk.red(`${pkg} uninstallation failed: ${err.message}`));
          else {
            if (stdout) console.log(chalk.green(stdout));
            if (stderr) console.error(chalk.yellow(stderr));
            console.log(chalk.magenta(`${pkg} uninstalled successfully.`));
          }
          resolve();
        });
      });
    }
    console.log(chalk.green('\nAll uninstallation tasks completed.'));
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
    const { npm_command, title } = item;
    console.log(chalk.cyan(`→ [ID ${id} | ${title}] Installing: ${npm_command}`));

    try {
      await new Promise((resolve, reject) => {
        exec(npm_command, { shell: true }, (error, stdout, stderr) => {
          if (error) {
            console.error(chalk.red(`(ID ${id}) Installation failed: ${error.message}`));
            return reject(error);
          }
          if (stdout) console.log(chalk.green(stdout));
          if (stderr) console.error(chalk.yellow(stderr));
          resolve();
        });
      });
    } catch {
      console.error(chalk.red(`Error occurred while installing ID ${id}. Continuing...`));
    }
  }

  console.log(chalk.green('\nAll installation tasks completed successfully.'));
  console.log(chalk.green(`
⠐⠐⠐⡐⠐⠐⠐⠐⠐⠐⠐⠐⠐⡀⠡⠐⠐⢀⠡⠐⠐⠐⠐⠐⠐⠐⠐⠐⠐⢐⠐⠐⠐⡐⢈
⡈⡈⠄⠐⢈⢈⢈⢈⢈⠨⠈⡈⠄⠄⣢⣬⣬⣴⣴⣬⣌⢈⠨⠈⡈⡈⠌⢈⠈⠄⠠⠁⡁⠄⠄
⠐⠀⡂⠁⠄⠄⠄⠐⡀⠄⠡⣀⣢⡾⢿⠯⠟⠓⠿⣞⠿⣳⣄⣁⠄⠐⢀⠂⠐⠐⡀⠁⠄⠂⢂
⠈⠄⠠⠁⠂⢂⢈⠠⠐⠐⠠⠼⣏⣙⡵⠞⠿⠛⡿⠶⣬⣙⣹⠦⢀⠡⠀⠂⡁⠡⠀⠡⠈⡐⠠
⢂⠈⠄⡈⠌⠠⠀⢂⢈⠈⠄⣸⣟⡇⠰⠖⢥⠂⠴⠶⠄⢸⣿⣇⠀⡂⠈⠄⠐⢀⠁⠌⠠⠐⢀
⠠⠐⠀⡂⠐⡀⠡⠠⠐⢀⢢⣿⠯⡇⢈⠛⢹⠁⠌⢋⠐⢸⢷⣿⡄⠠⠁⡈⡈⠄⠐⢀⢁⠈⠄
⡀⡁⠅⠐⠠⠐⠐⡈⠐⠠⠀⣿⢷⣿⡄⣢⡾⠟⣧⣄⢢⣿⡾⣷⠀⢂⠡⠠⠐⡀⠡⠠⠀⢂⠈
⠄⠐⡀⡁⠌⢀⠡⠀⠅⡈⢰⡿⣯⡷⣿⢿⣘⣶⣃⣿⣟⢷⣟⣿⡆⠐⡀⠂⡁⢐⠐⢀⠡⠀⠂
⢁⠂⠠⠐⢈⠠⠐⢀⠡⠠⠀⣛⡯⠇⡈⠻⢿⠽⡯⠟⠠⠸⢟⣚⠀⠡⢀⠡⠀⢂⠐⠠⠐⠈⠄
⠀⡂⢁⠈⠄⠐⡈⠠⠐⡼⠚⡉⠄⠂⣰⡔⠀⡂⣀⣿⢰⣌⠀⠍⠳⢮⠀⡐⢈⠀⡂⠁⠌⠐⡈
⠡⠀⢂⠐⢈⠠⠐⢀⠹⠀⢂⢐⣼⠞⢋⠀⠅⢄⣾⠃⠠⠙⠻⣦⡈⠈⠇⡀⠂⠄⠠⢁⠨⠀⠄
⠂⠡⠀⠌⡀⢂⠈⠄⠄⠡⠠⠈⡙⢷⣤⡂⠈⣼⠃⠨⢀⡵⠾⠋⡀⠡⠐⡀⠌⠐⡀⠂⡐⢈⠠
⠨⠐⢈⠠⠐⡀⢐⠀⡁⢂⠈⠄⠄⠂⡈⢃⠹⠏⠠⠁⡈⠅⡈⠄⠐⡀⠡⠀⢂⠁⠄⠡⠠⠀⢂
⠄⠨⢀⠐⡀⣂⡐⠠⣐⣀⠐⣈⣀⣿⠀⣄⣂⠈⣞⠠⣐⡠⠐⣈⡄⢐⡀⢡⡀⣂⣂⠂⡁⠌⢀
⠄⠨⢀⠐⢸⡩⢉⣸⡏⢘⡇⣿⠉⣿⢸⡧⠽⠆⣿⢸⡭⠽⠘⠧⢭⢸⡇⢸⡇⠿⢬⡠⠐⢈⠀
⡈⠄⠂⡐⢈⠙⢋⠀⡙⢋⢁⠉⡋⠋⠌⠙⢋⢡⡿⢈⠙⢋⠈⢛⠋⡈⠛⢙⠁⡙⢋⠠⠈⠄⡈
⠀⢂⠡⠠⠐⢀⠂⠐⠠⠀⠂⠄⢂⠈⠄⠁⠄⠄⢂⠠⠈⠄⠨⠀⠄⠂⡁⠄⢂⠠⠐⠠⠈⠄⠐
⠁⠄⠂⡈⢐⠀⠌⠈⠄⡁⠌⢀⠂⢐⠈⡀⠅⢈⠠⠐⢈⠐⡈⠐⡈⠠⠐⢀⠂⠐⡈⠄⠨⢀⠡
`));
})();