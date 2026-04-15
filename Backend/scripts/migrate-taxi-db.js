import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const sourceUri = process.env.SRC_MONGO_URI || process.env.SOURCE_MONGO_URI;
const targetUri =
  process.env.TGT_MONGO_URI ||
  process.env.TARGET_MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URI;

const sourceDbName =
  process.env.SRC_MONGO_DB ||
  process.env.SOURCE_MONGO_DB ||
  process.env.SOURCE_DB_NAME ||
  '';

const targetDbName =
  process.env.TGT_MONGO_DB ||
  process.env.TARGET_MONGO_DB ||
  process.env.TARGET_DB_NAME ||
  '';

const mode = String(process.argv[2] || 'discover').trim().toLowerCase();
const selectedCollections = String(process.env.MIGRATE_COLLECTIONS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const allowProtectedCollections =
  String(process.env.ALLOW_PROTECTED_COLLECTIONS || '').toLowerCase() === 'true';
const replaceExistingCollections =
  String(process.env.REPLACE_EXISTING_COLLECTIONS || '').toLowerCase() === 'true';

const PROTECTED_COLLECTION_PREFIXES = ['food_', 'quick_'];
const PROTECTED_COLLECTION_NAMES = new Set([
  'admins',
  'notifications',
  'otps',
  'payments',
  'refunds',
  'refresh_tokens',
  'settlements',
  'transactions',
  'users',
]);

const parseDbNameFromUri = (uri = '') => {
  try {
    const parsed = new URL(uri);
    const pathname = String(parsed.pathname || '').replace(/^\/+/, '');
    return pathname || '';
  } catch {
    return '';
  }
};

const resolvedSourceDbName = sourceDbName || parseDbNameFromUri(sourceUri);
const resolvedTargetDbName = targetDbName || parseDbNameFromUri(targetUri);

const assertRequired = () => {
  if (!sourceUri) {
    throw new Error('Missing SRC_MONGO_URI or SOURCE_MONGO_URI');
  }

  if (!targetUri) {
    throw new Error('Missing TGT_MONGO_URI / TARGET_MONGO_URI / MONGODB_URI / MONGO_URI');
  }
};

const connect = async (uri, dbName = '') =>
  mongoose.createConnection(uri, dbName ? { dbName } : {}).asPromise();

const getCollections = async (db) => {
  const collections = await db.listCollections({}, { nameOnly: false }).toArray();
  return collections
    .filter((item) => !String(item.name || '').startsWith('system.'))
    .map((item) => ({
      name: item.name,
      type: item.type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const isProtectedCollection = (collectionName) =>
  PROTECTED_COLLECTION_PREFIXES.some((prefix) => collectionName.startsWith(prefix)) ||
  PROTECTED_COLLECTION_NAMES.has(collectionName);

const filterCollectionsForMigration = (collections) => {
  const selected = selectedCollections.length > 0 ? new Set(selectedCollections) : null;

  return collections.filter((collection) => {
    if (selected && !selected.has(collection.name)) {
      return false;
    }

    if (!allowProtectedCollections && isProtectedCollection(collection.name)) {
      console.warn(
        `[skip] Protected target collection name "${collection.name}". ` +
          'Set ALLOW_PROTECTED_COLLECTIONS=true only if you really intend to replace it.',
      );
      return false;
    }

    return true;
  });
};

const ensureIndexes = async (sourceDb, targetDb, collectionName) => {
  const sourceIndexes = await sourceDb.collection(collectionName).indexes();

  for (const index of sourceIndexes) {
    if (index.name === '_id_') {
      continue;
    }

    const { key, name, ns, v, ...options } = index;
    await targetDb.collection(collectionName).createIndex(key, { name, ...options });
  }
};

const copyCollection = async (sourceDb, targetDb, collectionName) => {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  const docs = await sourceCollection.find({}).toArray();

  if (replaceExistingCollections) {
    await targetCollection.deleteMany({});
  }

  if (docs.length > 0) {
    try {
      if (replaceExistingCollections) {
        await targetCollection.insertMany(docs, { ordered: false });
      } else {
        await targetCollection.bulkWrite(
          docs.map((doc) => ({
            replaceOne: {
              filter: { _id: doc._id },
              replacement: doc,
              upsert: true,
            },
          })),
          { ordered: false },
        );
      }
    } catch (error) {
      if (error.code === 11000 || error.name === 'BulkWriteError') {
        console.warn(`[warn] Some docs in ${collectionName} were skipped due to duplicate keys.`);
      } else {
        throw error;
      }
    }
  }

  try {
    await ensureIndexes(sourceDb, targetDb, collectionName);
  } catch (error) {
    console.warn(`[warn] Could not ensure indexes for ${collectionName}: ${error.message}`);
  }

  return {
    collection: collectionName,
    count: docs.length,
  };
};

const discover = async () => {
  assertRequired();

  const sourceConn = await connect(sourceUri, resolvedSourceDbName);
  const targetConn = await connect(targetUri, resolvedTargetDbName);

  try {
    const sourceAdmin = sourceConn.db.admin();
    const targetAdmin = targetConn.db.admin();
    const [sourceDatabases, targetDatabases, sourceCollections, targetCollections] = await Promise.all([
      sourceAdmin.listDatabases(),
      targetAdmin.listDatabases(),
      getCollections(sourceConn.db),
      getCollections(targetConn.db),
    ]);

    console.log(
      JSON.stringify(
        {
          source: {
            uriDbName: resolvedSourceDbName || null,
            connectedDbName: sourceConn.db.databaseName,
            databases: sourceDatabases.databases.map((db) => db.name),
            collections: sourceCollections,
          },
          target: {
            uriDbName: resolvedTargetDbName || null,
            connectedDbName: targetConn.db.databaseName,
            databases: targetDatabases.databases.map((db) => db.name),
            collections: targetCollections,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
};

const migrate = async () => {
  assertRequired();

  if (!resolvedSourceDbName) {
    throw new Error('Missing source DB name. Set SRC_MONGO_DB / SOURCE_DB_NAME or include DB name in source URI.');
  }

  if (!resolvedTargetDbName) {
    throw new Error('Missing target DB name. Set TGT_MONGO_DB / TARGET_DB_NAME or include DB name in target URI.');
  }

  const sourceConn = await connect(sourceUri, resolvedSourceDbName);
  const targetConn = await connect(targetUri, resolvedTargetDbName);

  try {
    const collections = filterCollectionsForMigration(await getCollections(sourceConn.db));
    const results = [];

    for (const collection of collections) {
      const result = await copyCollection(sourceConn.db, targetConn.db, collection.name);
      results.push(result);
      console.log(`Copied ${result.count} docs: ${result.collection}`);
    }

    console.log(
      JSON.stringify(
        {
          sourceDb: sourceConn.db.databaseName,
          targetDb: targetConn.db.databaseName,
          collections: results,
        },
        null,
        2,
      ),
    );
  } finally {
    await sourceConn.close();
    await targetConn.close();
  }
};

if (mode === 'discover') {
  discover().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (mode === 'migrate') {
  migrate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.error('Usage: node scripts/migrate-taxi-db.js [discover|migrate]');
  process.exit(1);
}
