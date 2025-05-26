#!/usr/bin/env node
// src/index.js (ESM mode: uninstall filters by npm package name)

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';

// ASCII art for successful operation
const SUCCESS_ASCII_ART = `
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
`;

// ESM environment: Create __dirname
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

program
  .name('cojus')
  .description('CLI tool to install or uninstall APIs by document number')
  .version('0.1.5', '-v, --version', 'Display version information')
  .allowUnknownOption(true);

// Help command
program
  .command('help')
  .description('Display available commands')
  .action(() => {
    console.log(chalk.cyan('Available commands:'));
    console.log(chalk.green('  npx cojus -<doc_number> [-<doc_number> ...]') + ' : Install packages by document numbers');
    console.log(chalk.green('  npx cojus -del') + ' : Uninstall installed packages');
    console.log(chalk.green('  npx cojus -list') + ' : List all available packages in api_posts.json');
    console.log(chalk.green('  npx cojus -v, --version') + ' : Display version information');
    console.log(chalk.green('  npx cojus -help') + ' : Display this help message');
    process.exit(0);
  });

// List command
program
  .command('list')
  .description('List all available packages')
  .action(() => {
    const data = loadData();
    const list = data.map(item => ({ id: item.id, title: item.title }));
    console.log(chalk.cyan('Available packages:'));
    console.table(list);
    process.exit(0);
  });

program.parse(process.argv);
const args = process.argv.slice(2);

(async () => {
  const data = loadData(); // [{id, npm_command, title}, ...]
  const mapById = new Map(data.map(item => [item.id, item]));

  // Uninstall mode
  if (args.includes('-del')) {
    // Get installed packages
    let installedNames = [];
    try {
      const json = execSync('npm list --depth=0 --json').toString();
      const parsed = JSON.parse(json);
      installedNames = parsed.dependencies ? Object.keys(parsed.dependencies) : [];
    } catch {
      console.error(chalk.red('Error: Could not retrieve installed package list.'));
      process.exit(1);
    }

    // Extract package names from api_posts.json
    const itemsWithPkg = data.map(item => {
      const parts = item.npm_command.trim().split(' ');
      const pkgName = parts[parts.length - 1];
      return { ...item, pkgName };
    });

    // Filter actually installed packages
    const installedItems = itemsWithPkg.filter(item => installedNames.includes(item.pkgName));
    if (installedItems.length === 0) {
      console.log(chalk.yellow('No installed libraries found.'));
      process.exit(0);
    }

    // Choices: title (package name)
    const choices = installedItems.map(item => ({ name: `${item.title} (${item.pkgName})`, value: item.pkgName }));
    choices.unshift({ name: 'all', value: 'all' });

    const answers = await inquirer.prompt([{
      type: 'checkbox',
      name: 'toRemove',
      message: 'Select libraries to uninstall (use spacebar to select, then press enter)',
      choices,
      validate: sel => sel.length > 0 || 'At least one selection is required.'
    }]);

    let targets = answers.toRemove;
    if (targets.includes('all')) {
      targets = installedItems.map(item => item.pkgName);
    }

    for (const pkg of targets) {
      console.log(chalk.cyan(`→ Uninstalling ${pkg}...`));
      await new Promise(resolve => {
        exec(`npm uninstall ${pkg}`, { shell: true }, (err, stdout, stderr) => {
          if (err) console.error(chalk.red(`Failed to uninstall ${pkg}: ${err.message}`));
          else {
            if (stdout) console.log(chalk.green(stdout));
            if (stderr) console.error(chalk.yellow(stderr));
            console.log(chalk.magenta(`${pkg} uninstalled successfully.`));
          }
          resolve();
        });
      });
    }
    console.log(chalk.green('\nAll uninstall operations completed.'));
    console.log(SUCCESS_ASCII_ART);
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
          console.log(chalk.magenta(`(ID ${id}) Installed successfully.`));
          resolve();
        });
      });
    } catch {
      console.error(chalk.red(`Error during installation of ID ${id}. Continuing...`));
    }
  }

  console.log(chalk.magenta('\nAll operations completed successfully.'));
  console.log(SUCCESS_ASCII_ART);
})();