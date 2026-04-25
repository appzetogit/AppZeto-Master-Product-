const COLLECTION_PREFIX = process.env.HOTEL_MONGODB_COLLECTION_PREFIX?.trim()
  || process.env.MONGODB_COLLECTION_PREFIX?.trim()
  || "hotel";

export function prefixedCollection(collectionName) {
  if (!COLLECTION_PREFIX) {
    return collectionName;
  }

  return `${COLLECTION_PREFIX}_${collectionName}`;
}
