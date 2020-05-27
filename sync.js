const {
    isLangFilename,
    getLangDirPathMap,
    getLangFilePathMap,
    syncDirMode,
    getLangDirIndexOffset,
    syncFileMode

} = require("./Syncronizer.js");

const USAGE = `

This is a simple cli JSON locale files syncronizer.
It allows you to create translation schema for a single language
and that schema will be copied over to other specified languages, so
you would only need to fill the blanks.

It is also useful when your schema changes and you need to re-sync your json files

!NOTICE:
Current version does not support plurals. Yet.

This tool was inspired by i18nex-json-sync. For my project I really
needed a tool that would be able to handle namespaces, so I quickly made this one.


## Usage

node sync.js [OPTIONS]

### OPTIONS:

-p
    Path to locale directory in glob format
    with mandatory {{lang}} and optional {{ns}}  placeholders.

    Ex.: **/public/locales/{{lang}}/{{ns}}.json

    Or

    **/public/locales/{{lang}}.json

    Notice, {{lang}} occupies entire name of a file without extension, or directory,
    so you cannot have suffixes or prefixes with {{lang}}, for example
    this would be invalid: /locales/loc_{{lang}}/

    Same applies to {{ns}}

    If you supply {{ns}}, then {{lang}} must be before it in the path


-m
    Required.
    Master language that will be used as a template for other resources


-l
    comma separated language codes that must have reources exist. If resources
    are not found - they will be created.

-c
    This option will copy the value from master language if property does not exist in
    slave language.

-e
    This option will put an empty string if property does not exist OR matches
    value in master language.

-h
    Print this message

`


// variables
let blankMode = true
let masterLang;
let paths = []
let requestedLanguages;

function parseArgs() {
    const args = process.argv.slice(2);

    args.forEach((val, index, arr) => {
        switch (val) {

            case "-m":
                masterLang = arr[index + 1]
                break;

            case "-p":
                paths.push(arr[index + 1])
                break;

            case "-l":
                requestedLanguages = arr[index + 1].split(",")
                break
            case "-c":
                blankMode = false
                break
            case "-e":
                blankMode = true
                break
            case "-h":
                console.log(USAGE);
                process.exit(0)

        }
    })
}


function main(){
    parseArgs();

    if(!masterLang){
        console.log("Error: missing master language code");
        console.log(USAGE);
        process.exit(1)
    }
    for(let lPath of paths){
        if (isLangFilename(lPath)){
            let langMap =  getLangFilePathMap(lPath, requestedLanguages);
            syncFileMode(langMap, masterLang, blankMode);
        } else {
            let langMap =  getLangDirPathMap(lPath, requestedLanguages);
            let langDirIndexOffset = getLangDirIndexOffset(lPath);
            syncDirMode(langMap, masterLang, langDirIndexOffset, blankMode)
        }
    }
}

main();
