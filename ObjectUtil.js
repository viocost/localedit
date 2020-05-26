function isEquivalent (obj1, obj2){
    if(typeof(obj1) !== typeof(obj2)) return false;

    if (obj1 === null || (typeof obj2 !== "object")){
        return obj1 === obj2
    }

    if (obj1.constructor.name !== obj2.constructor.name){
        return false;
    }

    if(obj1 instanceof Array){
        if (obj1.length !== obj2.length){
            return false
        }
        for (let i=0; i<obj1.length; i++){
            if(!isEquivalent(obj1[i], obj2[i])) return false
        }
        return true;
    }

    let keys1 = Object.keys(obj1)
    let keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false;
    for(let key of keys1){
        if(!(keys2.includes(key))) return false;
        if(!isEquivalent(obj1[key], obj2[key])){
            return false;
        }
    }

    return true;
}


module.exports = {
    isEquivalent: isEquivalent
}
