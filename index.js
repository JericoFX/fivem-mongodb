//import { Db, MongoClient, ObjectId } from "mongodb";
const mongo = require("mongodb");
let isInitialized = false;
let client;
let db;
const url = "mongodb://localhost:27017"; //--GetConvar("mongodb_url", "changeme");
const dbName = GetConvar("mongodb_database", "changeme");

const collections = ["players", "inventory", "vehicles"];

async function hasInitialized() {
  return new Promise((resolve) => {
    if (isInitialized) {
      return resolve(true);
    }

    const timeout = setInterval(() => {
      if (!isInitialized) {
        return;
      }

      clearTimeout(timeout);
      return resolve(true);
    }, 250);
  });
}

async function init(url, databaseName, collections) {
  if (client) {
    return true;
  }
  client = new mongo.MongoClient(url, { retryReads: true, retryWrites: true });
  const didConnect = await client.connect().catch((err) => {
    console.error(err);
    return false;
  });
  if (!didConnect) {
    console.log(`Failed to connect to Database with ${url}`);
  }
  client.on("connectionClosed", () => {
    isInitialized = false;
    console.log(`Failed to connect to Database, retrying connection...`);
    Database.init(url, databaseName, collections);
  });
  db = client.db(databaseName);

  if (collections.length <= 0) {
    return true;
  }

  const currentCollections = await db.collections();

  for (let i = 0; i < collections.length; i++) {
    const collectionName = collections[i];
    const index = currentCollections.findIndex(
      (x) => x.collectionName === collectionName
    );

    if (index >= 0) {
      continue;
    }

    await db.createCollection(collectionName);
    console.log(`^3 Generated Collection - ${collectionName}`);
  }

  console.log(`^2 Connection Established`);
  isInitialized = true;
  return true;
}

(async () => {
  await init(url, dbName, collections);
})();

async function getDatabaseInstance() {
  await hasInitialized();
  return db;
}
exports("getDatabaseInstance", getDatabaseInstance);

async function doesCollectionExist(collection) {
  await hasInitialized();
  const currentCollections = await db.collections();
  const index = await currentCollections.findIndex(
    (x) => x.collectionName === collection
  );
  return index >= 0;
}
exports("doesCollectionExist", doesCollectionExist);

async function createCollection(collection, returnFalseIfExists = false) {
  if (!collection || typeof collection !== "string") {
    console.error("Failed to specify collections");
    return false;
  }
  await hasInitialized();
  const currentCollections = await db.collections();
  const index = await currentCollections.findIndex(
    (x) => x.collectionName === collection
  );
  if (index >= 0) {
    return returnFalseIfExists ? false : true;
  }

  const result = await db
    .createCollection(collection)
    .then(() => {
      console.log(`MONGODB Collection ${collection} created`);
    })
    .catch((err) => {
      return false;
    });

  if (!result) {
    return result;
  }

  return true;
}
exports("createCollection", createCollection);

async function fetchData(key, value, collectionName) {
  if (value === undefined || value === null) {
    console.error(`value passed in fetchData cannot be null or undefined`);
    return null;
  }

  if (!key || !collectionName) {
    console.error(
      `Failed to specify key, value, or collectionName for fetchAllByField.`
    );
    return null;
  }

  //  await hasInitialized();

  if (key === "_id" && typeof key !== "object") {
    value = new mongo.ObjectId(value);
  }

  return await db.collection(collectionName).findOne({ [key]: value });
}
exports("fetchData", fetchData);

/**
 * Fetch all data that matches a key and value pair as an array.
 * Use case: Fetching all users who have a specific boolean toggled.
 * @static
 * @template T
 * @param {string} key
 * @param {*} value
 * @param {string} collectionName
 * @return {Promise<T[]>}
 * @memberof Database
 */
async function fetchAllByField(key, value, collectionName) {
  if (value === undefined || value === null) {
    console.error(`value passed in fetchData cannot be null or undefined`);
    return null;
  }

  if (!key || !collectionName) {
    console.error(
      `Failed to specify key, value, or collectionName for fetchAllByField.`
    );
    return [];
  }

  await hasInitialized();

  if (key === "_id" && typeof key !== "object") {
    value = new mongo.ObjectId(value);
  }

  const collection = await db.collection(collectionName);
  return await collection.find({ [key]: value }).toArray();
}
exports("fetchAllByField", fetchAllByField);

/**
 * Get all elements from a collection.
 * @static
 * @template T
 * @param {string} collectionName
 * @return {Promise<Array<T[]>>}
 * @memberof Database
 */
async function fetchAllData(collectionName) {
  if (!collectionName) {
    console.error(`Failed to specify collectionName for fetchAllData.`);
    return;
  }

  await hasInitialized();

  const collection = await db.collection(collectionName);
  const data = collection.find({}).toArray();
  return data;
}
exports("fetchAllData", fetchAllData);

/**
 * Creates a search index for a specific 'text' field. Requires a 'string' field. Not numbers.
 * Use case: Searching for all users with 'Johnny' in their 'name' key.
 * @static
 * @template T
 * @param {string} key The key of the document that needs to be indexed
 * @param {string} collectionName The collection which this document needs indexing on.
 * @return {Promise<void>}
 * @memberof Database
 */
async function createSearchIndex(key, collectionName) {
  if (!collectionName) {
    console.error(`Failed to specify collectionName for createSearchIndex.`);
    return;
  }

  //  await hasInitialized();

  const collection = await db.collection(collectionName);
  const doesIndexExist = await collection.indexExists(key);

  if (!doesIndexExist) {
    await collection.createIndex({ [key]: "text" });
  }
}
exports("createSearchIndex", createSearchIndex);
/**
 * Fetch all data that uses a search term inside a field name.
 * Use case: Searching for all users with 'Johnny' in their 'name' key.
 * @static
 * @template T
 * @param {string} key
 * @param {string} searchTerm
 * @param {string} collectionName
 * @return {Promise<T[]>}
 * @memberof Database
 */
async function fetchWithSearch(searchTerm, collectionName) {
  if (!collectionName) {
    console.error(`Failed to specify collectionName for fetchWithSearch.`);
    return [];
  }

  await hasInitialized();

  const collection = await db.collection(collectionName);
  let results;

  try {
    results = await collection
      .find({ $text: { $search: searchTerm, $caseSensitive: false } })
      .toArray();
  } catch (err) {
    console.error(
      `Failed to use 'createSearchIndex' before searching collection. Use 'createSearchIndex' function once, and property must be of stirng type in object.`
    );
    return [];
  }

  return results;
}
exports("fetchWithSearch", fetchWithSearch);

/**
 * Insert a document and return the new full document with _id.
 * Use case: Insert a new entry into the database.
 * @param {T} document
 * @param {string} collection
 * @param {boolean} returnDocument
 * @returns {Promise<T | null>} Document
 * @template T
 */
async function insertData(document, collection, returnDocument = false) {
  if (!document || !collection) {
    console.error(`Failed to specify document or collection for insertData.`);
    return null;
  }
  await hasInitialized();

  const result = await db.collection(collection).insertOne(document);

  if (!returnDocument) {
    return null;
  }

  return await db.collection(collection).findOne({ _id: result.insertedId });
}
exports("insertData", insertData);

/**
 * Modify an existing document in the database. Must have an _id first to modify data.
 * Use case: Update an existing document with new data, or update existing data.
 * @static
 * @param {*} _id
 * @param {Object} data
 * @param {string} collection
 * @return {Promise<boolean>}
 * @memberof Database
 */
async function updatePartialData(_id, data, collection, unset) {
  if (!_id || !data || !collection) {
    console.error(
      `Failed to specify id, data or collection for updatePartialData.`
    );
    return null;
  }

  await hasInitialized();

  if (typeof _id !== "object") {
    _id = new mongo.ObjectId(_id);
  }

  try {
    if (unset) {
      await db
        .collection(collection)
        .findOneAndUpdate({ _id }, { $set: { ...data }, $unset: { ...unset } });
    } else {
      await db
        .collection(collection)
        .findOneAndUpdate({ _id }, { $set: { ...data } });
    }

    return true;
  } catch (err) {
    console.error(
      `Could not find and update a value with id: ${_id.toString()}`
    );
    return false;
  }
}
exports("updatePartialData", updatePartialData);

/**
 * Modify an existing document in the database using raw mongodb syntax. Must have an _id first to modify data.
 * Use case: Update an existing document with specific update operators
 * @static
 * @param {*} _id
 * @param {Object} rawData
 * @param {string} collection
 * @return {Promise<boolean>}
 * @memberof Database
 */
async function updatePartialDataRaw(_id, rawData, collection) {
  if (!_id || !rawData || !collection) {
    console.error(
      `Failed to specify id, data or collection for updatePartialDataRaw.`
    );
    return null;
  }

  await hasInitialized();

  if (typeof _id !== "object") {
    _id = new mongo.ObjectId(_id);
  }

  try {
    await db.collection(collection).findOneAndUpdate({ _id }, rawData);
    return true;
  } catch (err) {
    console.error(
      `Could not find and update a value with id: ${_id.toString()}`
    );
    return false;
  }
}
exports("updatePartialDataRaw", updatePartialDataRaw);
/**
 * Removes an existing field from an document. Must have an _id first to remove fields.
 * Use case: Update existing document with new data structure
 * @static
 * @param {*} _id
 * @param {Object} data
 * @param {string} collection
 * @return {Promise<boolean>}
 * @memberof Database
 */
async function removePartialData(_id, data, collection) {
  if (!_id || !data || !collection) {
    console.error(
      `Failed to specify id, data or collection for removePartialData.`
    );
    return null;
  }

  await hasInitialized();

  if (typeof _id !== "object") {
    _id = new mongo.ObjectId(_id);
  }

  try {
    await db
      .collection(collection)
      .findOneAndUpdate({ _id }, { $unset: { ...data } });
    return true;
  } catch (err) {
    console.error(
      `Could not find and update a value with id: ${_id.toString()}`
    );
    return false;
  }
}
exports("removePartialData", removePartialData);
/**
 * Delete a document by _id and collection.
 * Use case: Delete the entry from the database collection.
 * @static
 * @param {*} _id
 * @param {string} collection
 * @return {Promise<boolean>}
 * @memberof Database
 */
async function deleteById(_id, collection) {
  if (!_id || !collection) {
    console.error(`Failed to specify id, or collection for deleteById`);
    return false;
  }

  await hasInitialized();

  if (typeof _id !== "object") {
    _id = new mongo.ObjectId(_id);
  }

  try {
    await db.collection(collection).findOneAndDelete({ _id });
    return true;
  } catch (err) {
    return false;
  }
}
exports("deleteById", deleteById);
/**
 * Specify a list of fields to select from the database in a collection.
 * Use case: Selects all data from a collection and only returns the specified keys.
 * @template T
 * @param {string} collection
 * @param {string[]} fieldNames
 * @return {Promise<T[]>}
 * @memberof Database
 */
async function selectData(collection, keys) {
  if (!keys || !Array.isArray(keys) || !collection) {
    console.error(`Failed to specify keys, or collection for selectData`);
    return [];
  }

  await hasInitialized();

  const selectData = {
    _id: 1,
  };

  for (let i = 0; i < keys.length; i++) {
    selectData[keys[i]] = 1;
  }

  return await db
    .collection(collection)
    .find({})
    .project({ ...selectData })
    .toArray();
}
exports("selectData", selectData);
/**
 * Uses default mongodb element match functionality.
 *
 * See: https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/#array-of-embedded-documents
 *
 * @param {string} collection
 * @param {string} propertyName
 * @param {{ [key] }} elementMatch
 * @returns
 */
async function selectWithElementMatch(collection, propertyName, elementMatch) {
  if (!collection) {
    console.error(`Failed to specify keys, or collection for selectData`);
    return [];
  }

  await hasInitialized();

  const currentCollection = await db.collection(collection);

  return currentCollection
    .find({ [propertyName]: { $elemMatch: elementMatch } })
    .toArray();
}
exports("selectWithElementMatch", selectWithElementMatch);
/**
 * Update any data that matches specified field name and value.
 * Use case: Could be used to migrate old field values to new field values in bulk in a collection.
 * @param {string} fieldName
 * @param {*} fieldValue
 * @param {Object} data
 * @param {string} collection
 * @return {*}  {Promise<boolean>}
 * @memberof Database
 */
async function updateDataByFieldMatch(key, value, data, collection) {
  if (value === undefined || value === null) {
    console.error(`value passed in fetchData cannot be null or undefined`);
    return null;
  }

  if (!key || !data || !collection) {
    console.error(
      `Failed to specify key, value, data, or collection for updateDataByFieldMatch.`
    );
    return false;
  }

  await hasInitialized();

  if (key === "_id" && typeof value !== "object") {
    value = new mongo.ObjectId(value);
  }

  const updated = await db
    .collection(collection)
    .findOneAndUpdate({ [key]: value }, { $set: { ...data } });

  if (!updated || !updated.ok) {
    return false;
  }

  return true;
}
exports("updateDataByFieldMatch", updateDataByFieldMatch);
/**
 * Drop a collection from the database.
 * @static
 * @param {string} collectionName
 * @return {Promise<void>}
 * @memberof Database
 */
async function dropCollection(collectionName) {
  if (!collectionName) {
    console.error(`Failed to specify collectionName for dropCollection.`);
    return false;
  }

  await hasInitialized();

  let res = false;

  try {
    res = await db
      .collection(collectionName)
      .drop()
      .then((res) => {
        return true;
      })
      .catch((err) => {
        return false;
      });
  } catch (err) {
    console.log(`Did not find ${collectionName} to drop.`);
  }

  return res;
}
exports("dropCollection", dropCollection);
/**
 * Remove an entire database from MongoDB. Including all collections.
 * @static
 * @return {Promise<boolean>}
 * @memberof Database
 */
async function dropDatabase() {
  await hasInitialized();

  return await client
    .db()
    .dropDatabase()
    .catch((err) => {
      console.error(err);
      return false;
    })
    .then((res) => {
      console.log(`Dropped database successfully.`);
      return true;
    });
}
exports("dropDatabase", dropDatabase);
/**
 * Close the connection to the database.
 * @static
 * @return {Promise<void>}
 * @memberof Database
 */
async function close() {
  if (!client) {
    db = null;
    isInitialized = false;
    return;
  }

  await client.close(true);

  client = null;
  db = null;
  isInitialized = false;
}
exports("close", close);
