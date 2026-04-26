const COLLECTION_PREFIX = process.env.HOTEL_MONGODB_COLLECTION_PREFIX?.trim()
  || process.env.MONGODB_COLLECTION_PREFIX?.trim()
  || "hotel";

export function prefixedCollection(collectionName) {
  if (!COLLECTION_PREFIX) {
    return collectionName;
  }

  // Enforce underscores in hotel collection names
  const underscoredName = collectionName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/_+/g, '_');

  return `${COLLECTION_PREFIX}_${underscoredName}`;
}
