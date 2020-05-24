const fs = require("fs");
const fg = require("fast-glob");
const path = require("path");

class InvalidPathFormat extends Error {
    constructor(msg){
        super(msg)
        this.message = `Invalid path format: ${msg}`
    }
}


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

//Splitting template by components
let elements = testPath.split(path.sep).filter(i => i);
if(elements.length === 0 ) {
    console.log("Path template is empty");
    process.exit(1);
}


//Checking of {{lang}} is in path at all
if((testPath.match(/\{\{lang\}\}/g || []).length !== 1)){

        throw new InvalidPathFormat("There must be exactly one {{lang}} placeholder in the path")

}

//here will be stored glob template
let pTemplate;

if(elements[elements.length-1].indexOf(LANG_FORMAT) >= 0){
    //lang codes are files and {{lang}} applies to filenames

    //Checking if there is {{ns}} in path just in case. Shoudn't be
    if (test.testPath.match(/\{\{ns\}\}/g || []).length !== 0){

        throw new InvalidPathFormat("Invalid path format:");

    }

    pTemplate = testPath.replace(/\{\{lang\}\}/, "*");

}else {
    //lang codes are directories


    let langDirIndex = elements.indexOf(LANG_FORMAT);

    //Checking if {{lang}} placeholder is in correct format
    if (langDirIndex === -1){
        throw new InvalidPathFormat("{{lang}} placeholder is not found or has wrong format in path.")
        process.exit(1);
    }

    //Here we assume that the path to lang files from lang dir is determined and fixed by
    // constant offset from last path element
    langDirIndexOffset = elements.length - langDirIndex;
    if(!/\{\{ns\}\}\.json/.test(elements[elements.length-1])){
        throw new InvalidPathFormat("Last path element must be in form of {{ns}}.json>: " + elements[elements.lenght-1])
    }

    //explicitly setting the working mode
    LANG_IS_DIR = true


    pTemplate = testPath.replace(/\{\{lang\}\}/, "**").replace(/\{\{ns\}\}/, "*");



    //At this point all error checks are completed. replacing placeholders
    let locales = {}

    let rawPaths = fg.sync(pTemplate)
    let pathsSplit = rawPaths.map(p => p.split(path.sep))

    Array.from(new Set(pathsSplit.map(p=>{
        return p[p.length - langDirIndexOffset]
    }))).forEach(lang=>{
        locales[lang] = rawPaths.filter(rp=>{
            let patt = new RegExp(`.*\/${lang}\/.*`)
            return patt.test(rp);
        })
    })

    //processing
    if (!locales.hasOwnProperty(masterLang)){
        throw new Error("Master language not specified or not found")
    }

    //Set of slaves languages
    const slaves = Object.keys(locales).filter(l=>  l !== masterLang)

    for (let slaveLang of slaves){
        for (let masterFile of locales[masterLang]){

            //Deriving slave filePath
            let pathSplit = masterFile.split(path.sep)
            pathSplit[pathSplit.length - langDirIndexOffset] = slaveLang
            let slaveFile = path.join(...pathSplit);

            let masterData = fs.readFileSync(masterFile, "utf8")
            if (masterData.length === 0) continue

            console.log(masterData);
            masterData = JSON.parse(masterData)

            let slaveData;
            if(fs.existsSync(slaveFile)){
                slaveData = fs.readFileSync(slaveFile, "utf8");
                slaveData = slaveData.length > 0 ?  JSON.parse(slaveData) : {};
            } else {
                slaveData = {}
            }

            slaveData = syncObjects(masterData, slaveData)
            console.log(`Master: ${JSON.stringify(masterData)}, slave: ${JSON.stringify(slaveData)}`)

            fs.writeFileSync(slaveFile, JSON.stringify(slaveData, null, 2));

        }
    }


}


function syncObjects(master, slaveObj){
    let slave = JSON.parse(JSON.stringify(slaveObj));

    for(let key of Object.keys(slave)){
        if (!master.hasOwnProperty(key)) delete slave[key]
    }

    for(let key of Object.keys(master)){
        if (typeof master[key] === "object"){
            slave[key] = syncObjects(master[key], slave[key] || {})
        } else {
            if (slave[key] && slave[key] !== master[key]){
                console.log(`${key} Already translated`);
                continue
            } else {
                slave[key] = blankMode === EMPTY_STRING ? "" : master[key];
            }
        }
    }

    return slave;
}

function parseArgs(){
    const args = process.argv.slice(2);

    args.forEach((val, index, arr)=>{
        switch(val){

            case "-m":
                masterLang = arr[index+1]
                break;

            case "-p":
                LOCALES_ROOTS.push(arr[index+1])
                break;

            case "-l":
                requestedLanguages =  arr[index+1].split(",")
                break


            case "-c":
                blankMode = MASTER_COPY
                break

            case "-e":
                blankMode = EMPTY_STRING
                break

        }
    })


}
