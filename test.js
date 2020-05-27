const fs = require("fs-extra")
const path = require("path")
const { getLangDirPathMap,
        getLangFilePathMap,
        syncObjects,
        verifyPathTemplateFormat,
        syncFileMode
      } = require("./sync.js");
const { isEquivalent } = require("./ObjectUtil");

function assert(cond, msg = "Generic assertion"){
    let logMsg = cond ? `Passed: ${msg}` : `Failed: ${msg}`
    console.log(logMsg)
}


console.log("Preparing for testing");

fs.emptyDir(path.join(__dirname, "locales"))


let testObject1 = {
    sky: "sky",
    header: {
        title: "Title",
        test: "test",
        thing: "thing",
        component: {
            stuff: "foo",

        }
    },
    bar: "bar"
}

let testObject2 = {
    sky: "sky4",
    header: {
        title: "Title4",
        test: "test4",
        thing: "thing4",
        component: {
            stuff: "foo4j",

        }
    },
    bar: "baasdfr"
}


let testObject3 = {
    gjjbvcd: "sky4",
    gtjbvcd: "sky4",
    asdf: {
        title: "Title4",
        tist: "test4",
        thing: "thing4",
        component: {
            stuff: "foo4j",

        }
    },
    bar: "baasdfr"
}


function testGlobVerifier(){
    let valid = [
        "**/test/{{lang}}.json",
        "**/locales/{{lang}}/{{ns}}.json",
        "**/locales/{{lang}}/thing.json"
    ]

    let invalid = [
        "**/test/asdf-{{lang}}.json",
        "**/test/asdf-{{lang}}/file.json",
        "**/test/asdf-{{ns}}/file.json",
        "**/test/{{ns}}/file.json",
        "**/test/{{ns}}.json",
        "**/test/{{ns}}/{{lang}}/{{ns}}.json",
        "**/{{lang}}/{{ns}}/{{lang}}/{{ns}}.json",
    ]

    console.log("\nTesting glob path template verifier");
    for (let tmplt of valid){
        assert(verifyPathTemplateFormat(tmplt), tmplt)
    }

    for (let tmplt of invalid){
        assert(!verifyPathTemplateFormat(tmplt), tmplt)
    }

    console.log("Finished. \n\n");
}

function verifySync(objMaster, objSlave, objSynced, modeEmpty = true){


    for(let key in objSynced){
        if (!objMaster.hasOwnProperty(key)) {
            console.log("Found properties missing in master");
            return false;
        }

    }

    for (let key in objMaster){
        if(typeof objMaster[key] === "object"){
            if(!(verifySync(objMaster[key], objSlave ? objSlave[key] : undefined, objSynced[key]))){
                console.log("Nested object was not verified");
                return false
            }

        }  else {
            //comparing primitives
            if (objSlave && objSlave[key] && objSlave[key] !== objMaster[key]){
                if (objSlave[key] !== objSynced[key]) {
                    console.log(`Translation overritten for ${objSlave[key]}, ${objSynced[key]}`);
                    return false
                }
            } else {
                res = modeEmpty ? objSynced[key] === ""  : objSynced[key] === objMaster[key];
                if(!res) {
                    console.log(`Missing tranlsation not written propery: ${objMaster[key]} ${objSynced[key]}`);
                    return false;
                }
            }

        }
    }
    return true;

}

function runSyncTest(obj1, obj2, modeBlank = true, verbose = false){
    let synced = syncObjects(obj1, obj2, modeBlank)
    let msg = verbose ?  `Testing sync. obj1: ${obj1 ? JSON.stringify(obj1, null, 2) : ""}, ${obj2 ? JSON.stringify(obj2, null, 2) : ""}` :
        "Objects sync test";
    assert(verifySync(obj1, obj2, synced, modeBlank), msg)
}

function testObjectsSync(){
    console.log("\nTesting Testing object sync");
    runSyncTest({}, {}, true)
    runSyncTest({}, {}, false)
    runSyncTest(testObject1, testObject2, false)
    runSyncTest(testObject1, testObject2, true)
    runSyncTest(testObject1)
    runSyncTest(testObject1, testObject3, true)
    runSyncTest(testObject1, testObject3, false)
    runSyncTest(testObject2, testObject3, false)
    runSyncTest(testObject2, testObject3, true)
    console.log("Finished. \n\n");
}


function testDirPathsFunction(){
    fs.emptyDirSync("./locales")
    fs.mkdirSync("./locales/en")
    fs.writeFileSync("./locales/en/trans.json", JSON.stringify(testObject1))
    fs.writeFileSync("./locales/en/namespace.json", JSON.stringify(testObject2))

    let langMap  = getLangDirPathMap("**/locales/{{lang}}/{{ns}}.json", ["en", "fr", "ru", "cn"])

    console.log(JSON.stringify(langMap, null, 2))
}

function testFilePathsfunction(){
    fs.emptyDirSync("./locales")
    fs.writeFileSync("./locales/en.json", JSON.stringify(testObject1))
    let langMap =  getLangFilePathMap("**/locales/{{lang}}.json", ["en", "ru", "fr", "cn"]);

    console.log(JSON.stringify(langMap, null, 2));
}


function testFileModeSync(blankMode = true){

    fs.emptyDirSync("./locales")
    fs.writeFileSync("./locales/en.json", JSON.stringify(testObject1))
    let langMap =  getLangFilePathMap("**/locales/{{lang}}.json", ["en", "ru", "fr", "cn"]);

    syncFileMode(langMap, "en", blankMode);

    let paths = [
        "./locales/ru.json",
        "./locales/fr.json",
        "./locales/cn.json",
    ]
    for (let lPath of  paths){
        let data = JSON.parse(fs.readFileSync(lPath));

        let res = verifySync(testObject1,{},  data, blankMode)
        assert(res, lPath)
    }



}

testGlobVerifier()
testObjectsSync()
testDirPathsFunction()
testFilePathsfunction()
testFileModeSync(true);
testFileModeSync(false);
