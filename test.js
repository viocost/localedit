const fs = require("fs-extra")
const path = require("path")
const { syncObjects, verifyPathTemplateFormat } = require("./sync.js");
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

function testObjectsSync(){

    console.log("\nTesting Testing object sync");
    assert(isEquivalent(testObject1, syncObjects(testObject1, {})), "Syncing with empty object")
    assert(isEquivalent({}, syncObjects({}, testObject3)), "Syncing empty to filled object")
    assert(!isEquivalent(testObject1, syncObjects(testObject1, testObject2)), "1 to 2")
    assert(!isEquivalent(testObject1, syncObjects(testObject1, testObject3)), "1 to 3")
    assert(isEquivalent(testObject2, syncObjects(testObject2, testObject3)), "2 to 3")

    console.log("Finished. \n\n");
}

function testNormalMode(){
    fs.writeFileSync(JSON.stringify(testObject1, null, 2))

}


testGlobVerifier()
testObjectsSync()
