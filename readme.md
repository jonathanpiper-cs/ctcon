## CTCon

A simple cli tool for generating Contentstack content type JSON files with updated app/extension UIDs.

Expectation: 
In a multistack approach, the same app/extension will be installed in multiple stacks. When keeping content types in sync, it's necessary to change the app/extension uids in the content type schemas to ensure that the fields point to the app/extension installation in the target stack(s).

This tool requires management access to each stack (source and targets). This can be established in several ways. For simplicity over security, this implementation uses username/password authentication and an authtoken stored in a local file. Source and target stacks are defined using their names and api keys. Alternate methods might include local storage of management tokens for each stack, or using OAuth to authenticate (outside scope of this POC).

Usage:
npx tsx index.ts --ct content_type_uid
(Alternatively transpile the ts first then execute as js)

The tool first attempts to log in using a locally-stored authtoken. If the authtoken isn't found or fails, the tool attempts to log in using username/password stored in .env file. If this succeeds, the returned authtoken is stored for future use. If this fails, the tool returns an error.

The tool gets the content type definition from the source stack. It then gets a list of all installed apps/extensions in the source stack.

The tool iterates over the list of target stacks. For each stack, it will get a list of all apps/extensions. It then iterates over each field in the content type definition, looking for fields with the "extension_uid" property (indicating an app/extension). The extension_uid is found in the source stack list of apps/extensions, and that entry is referenced against the list of apps/extensions in the target stack to find the matching app/extension. The uid from the target stack is then placed into the content type definition, which is then scrubbed of unnecessary data and saved into a JSON file. This JSON file can then be imported into the target stack in the Contentstack UI.

Limitations:
This tool currently only looks for the "extension_uid" property at the root level of the content type. It does not look inside of group fields, modular blocks, or global fields.