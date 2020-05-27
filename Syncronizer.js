const fs = require("fs-extra");
const fg = require("fast-glob");
const path = require("path");

class InvalidPathFormat extends Error {constructor(msg) { super(msg)}}
class NoLocalePathProvided extends Error {constructor(msg) { super(msg)}}
class NoMasterLanguageProvided extends Error {constructor(msg) { super(msg)}}


//will be either EMPTY_STRING or MASTER_COPY

const LANG_FORMAT = "{{lang}}";
const NS_FORMAT = "{{ns}}";
let fileFormat = ".json";






// Only for {{lang}} === dirname mode with namespaces
// Given tmplt path returns map of languageCode => path
function getLangDirPathMap(tmplt,  requestedLanguages){


    let langDirIndexOffset = getLangDirIndexOffset(tmplt);

    //Forming real glob pattern
    pTemplate = tmplt.replace(/\{\{lang\}\}/, "**").replace(/\{\{ns\}\}/, "*");

    // Initializing map languagecode => path_to_translation_file
    let locales = {}

    //getting all the paths that match glob pattern
    let rawPaths = fg.sync(pTemplate)
    let pathsSplit = rawPaths.map(p => p.split(path.sep))

    //Getting existing lang codes from dir names
    let langCodes = new Set(pathsSplit.map(p => {
        //Extracting just language codes that are dir names
        // Finding them by offset from the end
        return p[p.length - langDirIndexOffset]
    }))

    if (requestedLanguages){
        //Merging requested languages with existing
        for(let lang of requestedLanguages){
            langCodes.add(lang)
        }
    }

    //Populating lang translation files
    Array.from(langCodes).forEach(lang => {
        locales[lang] = rawPaths.filter(rp => {
            let patt = new RegExp(`.*\/${lang}\/.*`)
            return patt.test(rp);
        })
    })

    return locales
}

function getLangFilePathMap(tmplt,  requestedLanguages){

    let pTemplate = tmplt.replace(/\{\{lang\}\}/, "*");


    // Initializing map languagecode => path_to_translation_file
    let locales = {}

    //getting all the paths that match glob pattern
    let rawPaths = fg.sync(pTemplate)

    let pathsSplit = rawPaths.map(p => p.split(path.sep))

    pathsSplit.forEach(p=>{
        let lastEl = p[p.length-1]
        //returning only filename before the extension assuming it is language code
        let langCode = lastEl.substring(0, lastEl.indexOf(fileFormat));
        locales[langCode] = path.join(...p);
    })

    for (let lang of requestedLanguages){
        if (!locales.hasOwnProperty(lang))
            locales[lang] = ""
    }

    return locales;
}



function syncFileMode(pathMap, masterLanguage, blankMode = true){
    let masterLangFile = pathMap[masterLanguage];
    let slaveLangKeys = Object.keys(pathMap).filter(lang => lang !== masterLanguage);

    let masterData = JSON.parse(fs.readFileSync(masterLangFile));

    let pathEls = pathMap[masterLanguage].split(path.sep);

    let localesDir = path.join(...pathEls.slice(0, pathEls.length-1));

    for (let lang of slaveLangKeys){
        let derivedPath = path.join(localesDir, `${lang}.json`);
        let slaveData = fs.existsSync(derivedPath) ? JSON.parse(fs.readFileSync(derivedPath)) :
            {};

        let synced = syncObjects(masterData, slaveData, blankMode);
        fs.writeFileSync(derivedPath, JSON.stringify(synced, null, 2));
    }

}

function syncDirMode(pathMap, masterLanguage, langDirIndexOffset,  blankMode = true){


    //Set of slaves languages
    const slaves = Object.keys(pathMap).filter(l => l !== masterLanguage)

    for (let slaveLang of slaves) {
        for (let masterFile of pathMap[masterLanguage]) {

            //Deriving slave filePath
            let pathSplit = masterFile.split(path.sep)
            pathSplit[pathSplit.length - langDirIndexOffset] = slaveLang
            let slaveFile = path.join(...pathSplit);
            let slaveDir = path.join(...(pathSplit.slice(0, pathSplit.length - 1)))
            if(!fs.existsSync(slaveDir)){

                fs.mkdirsSync(slaveDir);
            }

            let masterData = fs.readFileSync(masterFile, "utf8")
            if (masterData.length === 0) continue

            masterData = JSON.parse(masterData)

            let slaveData;
            if (fs.existsSync(slaveFile)) {
                slaveData = fs.readFileSync(slaveFile, "utf8");
                slaveData = slaveData.length > 0 ? JSON.parse(slaveData) : {};
            } else {
                slaveData = {}
            }

            slaveData = syncObjects(masterData, slaveData, blankMode)

            fs.writeFileSync(slaveFile, JSON.stringify(slaveData, null, 2));

        }
    }
}


//given glob path template
// determines if {{lang}} refers to dirname or a filename
function isLangFilename(tmplt){
    let elements = tmplt.split(path.sep).filter(i => i);
    return /\{\{lang\}\}/.test(elements[elements.length-1])
}

function verifyPathTemplateFormat(langPathTemplate) {
    let pattern = /(.*(?<!\{\{lang\}\})(?<!\{\{ns\}\})\/\{\{lang\}\}\/(?!\{\{lang\}\})\/?(\{\{ns\}\}|\w+)\.json|.*(?<!\{\{ns\}\})\/\{\{lang\}\}\.json)/
    return pattern.test(langPathTemplate)
}



function syncObjects(master = {}, slaveObj = {}, blankMode = true) {

    let slave = JSON.parse(JSON.stringify(slaveObj));

    for (let key of Object.keys(slave)) {
        if (!master.hasOwnProperty(key)) delete slave[key]
    }

    for (let key of Object.keys(master)) {
        if (typeof master[key] === "object") {
            slave[key] = syncObjects(master[key], slave[key] || {})
        } else {
            if (slave[key] && slave[key] !== master[key]) {
                //console.log(`${key} Already translated`);
                continue
            } else {
                slave[key] = blankMode  ? "" : master[key];
            }
        }
    }

    return slave;
}


function getLangDirIndexOffset(globPathTmplt){

    let pathElements = globPathTmplt.split(path.sep).filter(i => i);
    let langDirIndex = pathElements.indexOf(LANG_FORMAT);

    //Here we assume that the path to lang files from lang dir is determined and fixed by
    // constant offset from last path element
    return  pathElements.length - langDirIndex;
}



module.exports = {
    verifyPathTemplateFormat: verifyPathTemplateFormat,
    syncObjects: syncObjects,
    getLangDirPathMap: getLangDirPathMap,
    getLangFilePathMap: getLangFilePathMap,
    syncFileMode: syncFileMode,
    syncDirMode: syncDirMode,
    getLangDirIndexOffset: getLangDirIndexOffset
}
