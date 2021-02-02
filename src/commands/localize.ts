import { startProgressBar, endProgressBar } from '../utils/progressBar';
import { localizeFlow, pullFlow } from '../lib/flows';
import { checkProject } from '../utils/checks';
import { pullLocales } from '../lib/locales';
import inquirer = require('inquirer');
import { upperFirst } from '../utils/stringUtils';

/**
 * Adds localizations to Flow Nodes and Intents
 * @param localeName The name of the Cognigy Locale to process
 * @param resourceName The name of the Cognigy Flow to process
 */
export const localize = async ({ resourceType, resourceName, options }): Promise<void> => {

    if (resourceType !== "flow") {
        console.log(`\nLocalization of resource type ${resourceType} is not supported.`);
        process.exit(0);
    }

    // check if a locale was provided and if it actually exists
    await checkLocale(options.localeName);

    // check if project exists on Cognigy.AI and the APIKey can retrieve it
    await checkProject();

    // get confirmation from user that data will be overwritten
    const answers = (options.forceYes) ? { overwrite: true } : await inquirer
        .prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `This will overwrite data for ${upperFirst(resourceType)} ${resourceName}. Do you want to proceed?`
            }
        ]);

    if (!answers.overwrite) {
        console.log(`Aborting...`);
        return;
    }

    // start localization process
    console.log(`\nStarting to ${options.reverse ? 'remove localizations from' : 'add localizations to'} Flow '${resourceName}'...\n`);

    // localize the Flow
    await localizeFlow(resourceName, 50, options);

    // re-pull the Flow to have newest version on the HD
    console.log(`\nRefreshing local Flow copy...\n`);
    startProgressBar(100);
    await pullFlow(resourceName, 50);
    endProgressBar();

    console.log(`\nWe've successfully ${options.reverse ? 'removed localizations from' : 'added localizations to'} Flow '${resourceName}'...\n`);

    return;
};

/**
 * Checks if a locale name was provided and if the locale actually exists on the server
 * @param localeName 
 */
const checkLocale = async (localeName: string): Promise<boolean> => {
    let found = false;

    if (!localeName) {
        console.log(`\nYou must provide a localeName`);
        process.exit(0);
    } else {
        const locales = await pullLocales();
        
        if (!locales) {
            console.log(`\nLocales can't be loaded from server`);
            process.exit(0);
        }

        if (locales && Array.isArray(locales)) {
            locales.forEach((locale) => {
                if (locale.name === localeName) {
                    found = true;
                }
            })
        }

        if (!found) {
            console.log(`\nLocale ${localeName} can't be found. Please create it before continuing.`);
            process.exit(0);
        }
    }

    return found;
}