const fs = require('fs');
const chalk = require('chalk');
const chai = require('chai');
const glob = require('glob');
const helpers = require('yeoman-test');
const yeomanAssert = require('yeoman-assert');
const { join } = require('path');
const { getFilesArray, setProcessToDestination, projectTypeMessage } = require(`${process.env.PWD}/generators/app/utils`);
const { chaiExecAsync } = require('chai-exec');
const { PATHS, SCRIPTS, GENERAL_TEST_SETTINGS } = require(`${process.env.PWD}/generators/app/globals`);

const ONLY_FILES_TEST = process.env.FILES_ONLY;
const assert = chai.assert;

chai.use(chaiExecAsync);

function defaultTest({staticExpectedFiles, expectedFilesContent, generalSettings}) {
  GENERAL_TEST_SETTINGS.forEach(prompts => {
    const testSettings = {...prompts, ...generalSettings, expectedFilesContent, staticExpectedFiles};

    describe(projectTypeMessage(testSettings), async () => {
      before(() => {
        return helpers
          .run(PATHS.appFolder)
          .inDir(PATHS.tempFolder)
          .withPrompts(testSettings);
      });

      const newCfg = JSON.parse(fs.readFileSync(join(PATHS.tempMarkupFolder, 'config.json')));
      const newPkgfilePath = join(PATHS.tempMarkupFolder, 'package.json');
      const jsFile = join(PATHS.tempMarkupFolder, newCfg.src, newCfg.scripts.src, `${newCfg.scripts.bundle}.${newCfg.scripts.extension}`);
      const stylesFile = join(PATHS.tempMarkupFolder, newCfg.src, newCfg.styles.src, `${newCfg.styles.bundle}.${newCfg.styles.extension}`);

      describe('Generating files:', () => {
        it(chalk.green('Create expected files'), async () => {
          setProcessToDestination();

          const unexpectedFiles = testSettings.staticUnexpectedFiles;
          const expectedFiles = [...await getFilesArray(PATHS.baseFolder)].concat(testSettings.staticExpectedFiles);

          await yeomanAssert.file(expectedFiles);
          await yeomanAssert.noFile(unexpectedFiles);
        });
      });

      describe('Checking dependencies:', () => {
        setProcessToDestination();

        if (testSettings.expectedFilesContent.hasOwnProperty('styles')) {
          it(chalk.green('Added all necessary content to Styles:'), () => {
            testSettings.expectedFilesContent.styles.map(content => yeomanAssert.fileContent(stylesFile, content));
          });
        }
      });


      if (!ONLY_FILES_TEST) {
        describe('Installing dependencies:', () => {
          it(chalk.green('Install all dependencies'), async () => {
            const cli = await chaiExecAsync(SCRIPTS.install);
            assert.exitCode(cli, 0);
          });
        });

        describe('Running build process:', () => {
          it(chalk.green('Build process is correct:'), async () => {
            const cli = await chaiExecAsync(SCRIPTS.build);
            assert.exitCode(cli, 0);
          });
        });

        describe('Building correct files:', () => {
          it(chalk.green('Generate all files based on project config'), async () => {
            setProcessToDestination();

            const newCfg = JSON.parse(fs.readFileSync(join(PATHS.tempMarkupFolder, 'config.json')));
            const stylesFile = join(newCfg.dest, newCfg.styles.dest, `${newCfg.styles.bundle}.css`);
            const jsFile = join(newCfg.dest, newCfg.scripts.dest, `${newCfg.scripts.bundle}.${newCfg.scripts.extension}`);
            const HTMLFiles = join(newCfg.dest, newCfg.templates.dest, `*.${newCfg.templates.extension}`);

            const expectedCompilation = [stylesFile, jsFile];

            glob(HTMLFiles, {}, async (err, files) => {
              expectedCompilation.push(...files);
              await yeomanAssert.file(expectedCompilation);
            })
          });
        });
      }
    });
  })
}

module.exports = defaultTest;

