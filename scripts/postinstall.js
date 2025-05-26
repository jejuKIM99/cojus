#!/usr/bin/env node
// scripts/postinstall.js (Displays ASCII art and progress bar on npm install)

import chalk from 'chalk';
import ProgressBar from 'progress';

try {
  const asciiArt = `
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

  console.log(chalk.green(asciiArt));
  console.log(chalk.cyan('Installing cojus-cli...'));

  const bar = new ProgressBar('[:bar] :percent :etas', {
    total: 20,
    width: 30,
    complete: '█',
    incomplete: ' ',
  });

  let progress = 0;
  const interval = setInterval(() => {
    if (progress < 20) {
      bar.tick();
      progress++;
    } else {
      clearInterval(interval);
      console.log(chalk.green('cojus-cli installation completed!'));
    }
  }, 100);
} catch (error) {
  console.error(chalk.red(`Error in postinstall script: ${error.message}`));
}