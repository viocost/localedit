const fs = require("fs");
const fg = require("fast-glob");
const path = require("path");

class InvalidPathFormat extends Error {constructor(msg) { super(msg)}}
class NoLocalePathProvided extends Error {constructor(msg) { super(msg)}}
class NoMasterLanguageProvided extends Error {constructor(msg) { super(msg)}}


const USAGE = `

It is a simple cli syncronizer of JSON locale files.
So, you can create a schema for a single language,
and sync it over to other requested languages, so
you would only need to fill the blanks.

It would be also useful if schema changes to re-sync your json files


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


`

//All root paths to process
const LOCALES_ROOTS = [];

//Master language
let masterLang;

const EMPTY_STRING = Symbol("empty_string")
const MASTER_COPY = Symbol("master_copy")

//will be either EMPTY_STRING or MASTER_COPY
let blankMode

let requestedLanguages = []

const LANG_FORMAT = "{{lang}}";
const NS_FORMAT = "{{ns}}";
let fileFormat = "json";

let langDirIndexOffset = null
let LANG_IS_DIR = false

const testPath = `**/locales/{{lang}}/{{ns}}.${fileFormat}`

parseArgs();


function runSync(pathTemplates, masterLang, emptyStringOnMissing = true, languages) {

    //Splitting template by components
    if (!pathTemplates || pathTemplates.length == 0 ) throw new NoLocalePathProvided();
    for(let tmplt of pathTemplates){
        if(!verifyPathTemplateFormat(tmplt)) throw new InvalidPathFormat(tmplt);
        sync(tmplt, masterLang, emptyStringOnMissing, languages)
    }

    //here will be stored glob template
    let pTemplate;

    if (elements[elements.length - 1].indexOf(LANG_FORMAT) >= 0) {
        //lang codes are files and {{lang}} applies to filenames

        //Checking if there is {{ns}} in path just in case. Shoudn't be
        if (test.testPath.match(/\{\{ns\}\}/g || []).length !== 0) {

            throw new InvalidPathFormat("Invalid path format:");

        }

        pTemplate = testPath.replace(/\{\{lang\}\}/, "*");

    } else {
        //lang codes are directories



    }

}

function sync(tmplt, masterLang, emptyStringOnMissing, languages){

    let pathElements = tmplt.split(path.sep).filter(i => i);

    let langDirIndex = pathElements.indexOf(LANG_FORMAT);

    //Here we assume that the path to lang files from lang dir is determined and fixed by
    // constant offset from last path element
    let langDirIndexOffset = pathElements.length - langDirIndex;


    //explicitly setting the working mode
    LANG_IS_DIR = true


    pTemplate = testPath.replace(/\{\{lang\}\}/, "**").replace(/\{\{ns\}\}/, "*");



    //At this point all error checks are completed. replacing placeholders
    let locales = {}

    let rawPaths = fg.sync(pTemplate)
    let pathsSplit = rawPaths.map(p => p.split(path.sep))

    Array.from(new Set(pathsSplit.map(p => {
        return p[p.length - langDirIndexOffset]
    }))).forEach(lang => {
        locales[lang] = rawPaths.filter(rp => {
            let patt = new RegExp(`.*\/${lang}\/.*`)
            return patt.test(rp);
        })
    })

    //processing
    if (!locales.hasOwnProperty(masterLang)) {
        throw new Error("Master language not specified or not found")
    }

    //Set of slaves languages
    const slaves = Object.keys(locales).filter(l => l !== masterLang)

    for (let slaveLang of slaves) {
        for (let masterFile of locales[masterLang]) {

            //Deriving slave filePath
            let pathSplit = masterFile.split(path.sep)
            pathSplit[pathSplit.length - langDirIndexOffset] = slaveLang
            let slaveFile = path.join(...pathSplit);

            let masterData = fs.readFileSync(masterFile, "utf8")
            if (masterData.length === 0) continue

            console.log(masterData);
            masterData = JSON.parse(masterData)

            let slaveData;
            if (fs.existsSync(slaveFile)) {
                slaveData = fs.readFileSync(slaveFile, "utf8");
                slaveData = slaveData.length > 0 ? JSON.parse(slaveData) : {};
            } else {
                slaveData = {}
            }

            slaveData = syncObjects(masterData, slaveData)
            console.log(`Master: ${JSON.stringify(masterData)}, slave: ${JSON.stringify(slaveData)}`)

            fs.writeFileSync(slaveFile, JSON.stringify(slaveData, null, 2));

        }
    }


}




function verifyPathTemplateFormat(langPathTemplate) {
    let pattern = /(.*(?<!\{\{lang\}\})(?<!\{\{ns\}\})\/\{\{lang\}\}\/(?!\{\{lang\}\})\/?(\{\{ns\}\}|\w+)\.json|.*(?<!\{\{ns\}\})\/\{\{lang\}\}\.json)/
    return pattern.test(langPathTemplate)
}



function syncObjects(master, slaveObj) {
    let slave = JSON.parse(JSON.stringify(slaveObj));

    for (let key of Object.keys(slave)) {
        if (!master.hasOwnProperty(key)) delete slave[key]
    }

    for (let key of Object.keys(master)) {
        if (typeof master[key] === "object") {
            slave[key] = syncObjects(master[key], slave[key] || {})
        } else {
            if (slave[key] && slave[key] !== master[key]) {
/k/                console.log(`${key} Already translated`);
                continue
            } else {
                slave[key] = blankMode === EMPTY_STRING ? "" : master[key];
            }
        }
    }

    return slave;
}

function parseArgs() {
    const args = process.argv.slice(2);

    args.forEach((val, index, arr) => {
        switch (val) {

            case "-m":
                masterLang = arr[index + 1]
                break;

            case "-p":
                LOCALES_ROOTS.push(arr[index + 1])
                break;

            case "-l":
                requestedLanguages = arr[index + 1].split(",")
                break
            case "-c":
                blankMode = MASTER_COPY
                break

            case "-e":
                blankMode = EMPTY_STRING
                break

            case "-h":
                console.log(USAGE);
                process.exit(0)

        }
    })
}


module.exports = {
    verifyPathTemplateFormat: verifyPathTemplateFormat,
    syncObjects: syncObjects
}
