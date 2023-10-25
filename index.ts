import "dotenv/config";
import fs from "node:fs";
import chalk from "chalk";
import boxen from "boxen";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const log = console.log;

const argv = await yargs(hideBin(process.argv))
    .usage("Usage: $0 -ct [content type uid to copy]")
    .options({
        ct: { type: "string", demandOption: true, alias: "ContentType" },
    }).argv;

type SimpleStack = {
    name: string;
    key: string;
    extensions?: any[];
};

const contentType = argv.ct;
const BASE_URL = "https://api.contentstack.io/v3/";
const targetStacks: SimpleStack[] = [
    {
        name: "Goal-Oriented Bicycling",
        key: "blt38fde950b30192d4",
    },
];
const sourceStack: SimpleStack = {
    name: "Stylish Outdoor Gear",
    key: "blt2e8819a463338e6b",
};

const login = async () => {
    try {
        const authtoken = fs.readFileSync("./authtoken", "utf8");
        log(chalk.blue("Using stored authtoken to log in."));
        return authtoken;
    } catch (err) {
        console.error(err);
    }
    const user = {
        user: {
            email: process.env.USER_EMAIL,
            password: process.env.USER_PASSWORD,
            tfa_token: "",
        },
    };
    log(chalk.blue("Logging in with user session API endpoint."));
    const loginResponse = await fetch(`${BASE_URL}user-session`, {
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(user),
    });
    const loginJSON = await loginResponse.json();
    fs.writeFileSync("./authtoken", loginJSON?.user?.authtoken, {
        encoding: "utf8",
        flag: "w",
    });
    return loginJSON?.user?.authtoken;
};

const getContentType = async (authtoken: string) => {
    const ctResponse = await fetch(
        `${BASE_URL}content_types/${contentType}?include_global_schema=true`,
        {
            headers: {
                "Content-Type": "application/json",
                authtoken: authtoken,
                api_key: sourceStack.key,
            },
        }
    );
    const ctJSON = await ctResponse.json();
    if (ctJSON?.error_code) {
        log(
            chalk.red.bold(
                `Contentstack returned an error: ${ctJSON.error_message}`
            )
        );
        process.exit();
    }
    return ctJSON.content_type;
};

const getStackExtensions = async (stack: SimpleStack, authtoken: string) => {
    try {
        log(
            chalk.blue(
                `Fetching list of extensions and apps for ${stack.name}.`
            )
        );
        const extensionsRequest = await fetch(
            `${BASE_URL}extensions?include_marketplace_extensions=true`,
            {
                headers: {
                    "Content-Type": "application/json",
                    authtoken: authtoken,
                    api_key: stack.key,
                },
            }
        );
        const extensionsJSON = await extensionsRequest.json();
        log(
            chalk.green.bold(
                `Fetched extensions and apps installed on ${stack.name}!  🎉`
            )
        );
        return extensionsJSON.extensions;
    } catch (err) {
        console.error(err);
    }
};

const main = async () => {
    const authtoken = await login();
    log(
        boxen(chalk.green.bold("Logged in! 🚀"), {
            padding: { left: 2 },
            width: 60,
        })
    );
    log(
        chalk.blue(
            `Fetching content type ${contentType} on stack ${sourceStack.name}.`
        )
    );
    const ct = await getContentType(authtoken);
    log(chalk.green.bold(`Schema for ${contentType} fetched!`));
    const ctSchema = ct.schema;
    const sourceStackExtensions = await getStackExtensions(
        sourceStack,
        authtoken
    );
    // const targetStackExtensions = await Promise.all(
    //     targetStacks.map(async (s: SimpleStack) => {
    //         const stackExtensions = await getStackExtensions(s, authtoken);
    //         return { ...s, extensions: stackExtensions };
    //     })
    // );
    // console.log(targetStackExtensions)
    targetStacks.forEach(async (stack: SimpleStack) => {
        log(boxen(chalk.blue(`Working in stack ${stack.name}.`), {
            padding: { left: 2 },
            width: 60,
        }));
        const stackExtensions = await getStackExtensions(stack, authtoken);
        log(
            chalk.blue(
                "Parsing the content type schema for extensions or apps."
            )
        );
        const newCTSchema = ctSchema.map((f: any) => {
            if (f.extension_uid) {
                log(
                    chalk.blue(
                        `Field ${f.display_name} refers to an extension or app.`
                    )
                );
                const extension = sourceStackExtensions.filter((e: any) => {
                    return e.uid === f.extension_uid;
                })[0];
                const matchedTargetExtension = stackExtensions.filter(
                    (e: any) => {
                        return (
                            e.title === extension.title &&
                            e.type === extension.type
                        );
                    }
                )[0];
                log(
                    chalk.green.bold(
                        `Replacing uid for extension/app ${matchedTargetExtension.title} in field ${f.display_name}.`
                    )
                );
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
        fs.existsSync(dirName) ? "" : fs.mkdir(dirName, function () {});
        log(
            chalk.green.bold(
                `Writing new content type definition to ${dirName}/${contentType}.json. 🔥`
            )
        );
        fs.writeFileSync(
            `${dirName}/${contentType}.json`,
            JSON.stringify(newCT),
            { encoding: "utf8", flag: "w" }
        );
    });
};

main();
