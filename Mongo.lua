local Await = Citizen.Await

Mongo = {}
function Mongo.getDatabaseInstance()
    local p = promise.new()
    p:resolve(exports["fivem-mongodb"]:getDatabaseInstance())
    return Await(p)
end

function Mongo.doesCollectionExist(collection)
    assert(type(collection) == "string", "MONGO ERROR Collection is not a string")
    local p = promise.new()
    p:resolve(exports["fivem-mongodb"]:doesCollectionExist(collection))
    return Await(p)
end

function Mongo.createCollection(collection, returnFalseIfExist)
    if not returnFalseIfExist then returnFalseIfExist = false end
    assert(type(collection) == "string", "MONGO ERROR Collection is not a string")
    local p = promise.new()
    p:resolve(exports["fivem-mongodb"]:createCollection(collection, returnFalseIfExist))
    return Await(p)
end

function Mongo.fetchAllData(collectionName)
    assert(type(collectionName) == "string", "MONGO ERROR Collection is not a string")
    return exports["fivem-mongodb"]:fetchAllData(collectionName)
end

function Mongo.createSearchIndex(key, collectionName)
    assert(type(collectionName) == "string", "MONGO ERROR Collection is not a string")
    assert(type(key) == "string", "MONGO ERROR key is not a string")
    local p = promise.new()
    p:resolve(exports["fivem-mongodb"]:fetchAllData(key, collectionName))
    return Await(p)
end

function Mongo.fetchAllByField(key, value, collectionName)
    assert(type(collectionName) == "string", "MONGO ERROR Collection is not a string")
    assert(type(key) == "string", "MONGO ERROR key is not a string")
    assert(type(value) == "string" or type(value) == "number", "MONGO ERROR value is not a string or number")
    local p = promise.new()
    p:resolve(exports["fivem-mongodb"]:fetchAllByField(key, value, collectionName))
    return Await(p)
end
