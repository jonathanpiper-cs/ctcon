import "dotenv/config";
import fs from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// A basic stack type definition for use in the script.
type SimpleStack = {
    name: string;
    key: string;
    extensions?: any[];
};

// Simplifying logging.
const log = console.log;

// Get a content type uid from the user.
const argv = await yargs(hideBin(process.argv))
    .usage("Usage: $0 -ct [content type uid to copy]")
    .options({
        ct: { type: "string", demandOption: true, alias: "ContentType" },
    }).argv;

const contentType = argv.ct;

// Base URL for accessing CMA API endpoints.
const BASE_URL = "https://api.contentstack.io/v3/";

// Create user object.
const user = {
    user: {
        email: process.env.USER_EMAIL,
        password: process.env.USER_PASSWORD,
    },
};

// The source from which the content type schemas will be fetched.
const sourceStack: SimpleStack = {
    name: "Stylish Outdoor Gear",
    key: "blt2e8819a463338e6b",
};

// Target stacks defined with name and api key values. This array will be iterated over to create new copies of the content type schema.
// This could be expanded to include management tokens if prefered over authtoken method.
const targetStacks: SimpleStack[] = [
    {
        name: "Goal-Oriented Bicycling",
        key: "blt38fde950b30192d4",
    },
];

// Function to load authtoken from local file and attempt to validate against user information endpoint.
// This is intended to avoid unintended invalidation of existing user sessions.
const authenticateWithAuthtoken = async () => {
    var authtoken, loginResponse, loginJSON;
    try {
        if (fs.existsSync("./.authtoken")) {
            authtoken = fs.readFileSync("./.authtoken", "utf8");
        } else {
            log(chalk.red("Couldn't find local authtoken file."));
            return false;
        }
        log(chalk.blue("Using stored authtoken to log in."));
        // Get user info to validate authtoken.
        loginResponse = await fetch(`${BASE_URL}user`, {
            headers: {
                authtoken: authtoken,
            },
        });
        loginJSON = await loginResponse.json();
        // If authtoken fails, proceed to password authentication.
        if (loginJSON?.error_code) {
            log(chalk.red.bold(`Unable to log in using authtoken. Proceeding to password authentication.`));
            return false;
        }
        return authtoken;
    } catch (err) {
        console.error(err);
    }
};

const authenticateWithEmailPassword = async () => {
    var authtoken, loginResponse, loginJSON;
    try {
        // Log into user session endpoint using email and password.
        log(chalk.blue("Logging in with user session API endpoint."));
        loginResponse = await fetch(`${BASE_URL}user-session`, {
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(user),
        });
        loginJSON = await loginResponse.json();
        // Check for valid authentication.
        if (loginJSON.error_code) {
            log(chalk.red.bold(`Unable to log in using password. Contentstack sent the following message:\n${loginJSON.error_message}`));
            return false;
        }
        authtoken = loginJSON?.user?.authtoken;
        log(chalk.blue("Writing authtoken to local file."));
        fs.writeFileSync("./.authtoken", JSON.stringify(authtoken).replaceAll('"', ""), {
            encoding: "utf8",
            flag: "w",
        });
        // If authenticated, write the returned authtoken to file.
        return authtoken;
    } catch (err) {
        console.error(err);
    }
};

// Login function.
const login = async () => {
    var authtoken = await authenticateWithAuthtoken();
    if (!authtoken) {
        authtoken = await authenticateWithEmailPassword();
    }
    if (authtoken) {
        log(
            boxen(chalk.green.bold("Logged in! 🚀"), {
                padding: { left: 2 },
                width: 60,
            })
        );
        return authtoken;
    } else {
        console.error("Could not log in.");
        process.exit();
    }
};

// Function to get content type from source stack.
const getContentType = async (authtoken: string) => {
    log(chalk.blue(`Fetching content type ${contentType} on stack ${sourceStack.name}.`));
    const ctResponse = await fetch(`${BASE_URL}content_types/${contentType}?include_global_schema=true`, {
        headers: {
            "Content-Type": "application/json",
            authtoken: authtoken,
            api_key: sourceStack.key,
        },
    });
    const ctJSON = await ctResponse.json();
    if (ctJSON?.error_code) {
        log(chalk.red.bold(`Contentstack returned an error: ${ctJSON.error_message}`));
        process.exit();
    }
    log(chalk.green.bold(`Schema for ${contentType} fetched!`));
    return ctJSON.content_type;
};

// Function to get extensions and apps installed in a stack.
const getStackExtensions = async (stack: SimpleStack, authtoken: string) => {
    try {
        log(chalk.blue(`Fetching list of extensions and apps for ${stack.name}.`));
        const extensionsRequest = await fetch(`${BASE_URL}extensions?include_marketplace_extensions=true`, {
            headers: {
                "Content-Type": "application/json",
                authtoken: authtoken,
                api_key: stack.key,
            },
        });
        const extensionsJSON = await extensionsRequest.json();
        log(chalk.green.bold(`Fetched extensions and apps installed on ${stack.name}!  🎉`));
        return extensionsJSON.extensions;
    } catch (err) {
        console.error(err);
    }
};

// Main function!
const main = async () => {
    // Log in, fetch content type, get extensions/apps in source stack.
    const authtoken = (await login()).toString();
    const ct = await getContentType(authtoken);
    const ctSchema = ct.schema;
    const sourceStackExtensions = await getStackExtensions(sourceStack, authtoken);

    // Iterate through each target stack to get installed extensions/apps, parse source content type schema to replace 'extension_uid' fields (indicating extension/app)
    // with the relevant uid from the target stack, then write modified schema to file.
    targetStacks.forEach(async (stack: SimpleStack) => {
        log(
            boxen(chalk.blue(`Working in stack ${stack.name}.`), {
                padding: { left: 2 },
                width: 60,
            })
        );
        const stackExtensions = await getStackExtensions(stack, authtoken);
        log(chalk.blue("Parsing the content type schema for extensions or apps."));
        const newCTSchema = ctSchema.map((f: any) => {
            if (f.extension_uid) {
                log(chalk.blue(`Field ${f.display_name} refers to an extension or app.`));
                const extension = sourceStackExtensions.filter((e: any) => {
                    return e.uid === f.extension_uid;
                })[0];
                const matchedTargetExtension = stackExtensions.filter((e: any) => {
                    return e.title === extension.title && e.type === extension.type;
                })[0];
                log(chalk.green.bold(`Replacing uid for extension/app ${matchedTargetExtension.title} in field ${f.display_name}.`));
                f.extension_uid = matchedTargetExtension.uid;
            }
            return f;
        });
        const newCT = {
            title: ct.title,
            uid: ct.uid,
            schema: newCTSchema,
        };
        const dirName = `./${stack.name}_${stack.key}`;
        fs.existsSync(dirName) ? null : fs.mkdir(dirName, function () {});
        log(chalk.green.bold(`Writing new content type definition to ${dirName}/${contentType}.json. 🔥`));
        fs.writeFileSync(`${dirName}/${contentType}.json`, JSON.stringify(newCT), { encoding: "utf8", flag: "w" });
    });
};

// Execute main function.
main();
