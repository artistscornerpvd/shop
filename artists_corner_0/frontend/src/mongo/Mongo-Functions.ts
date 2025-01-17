// Mongo-Functions.ts
import {
  Stitch,
  RemoteMongoClient,
  UserApiKeyCredential,
  RemoteMongoCollection,
  StitchAppClient,
  BSON,
} from "mongodb-stitch-browser-sdk";
import Item from "../models/item";
import Account from "../models/account";
import { ACCESS_TOKEN } from "../private/api.js";

export type ItemTuple = [Item[], Item[]] | [];

let client: StitchAppClient | undefined;
let mongodb: RemoteMongoClient | undefined;

/**
 * This file contains all the functions that interact with the MongoDB database. 
 * The following functions are (not including helpers):
 * 
 * Initialize connection:
 * initializeStitchClient()
 * 
 * 
 * Access database:
 * Items:
 * getAllItems() => ItemTuple
 * getItemsByCategory(category: string) => ItemTuple
 * getItemsByCategoryAndSubcategory(category: string, subcategory: string) => ItemTuple
 * getItemsBySubcategory(subcategory: string) => ItemTuple
 * searchItems(keywords: string) => ItemTuple
 * getItemById(id: BSON.ObjectId) => Item
 * getItemListById(itemIds: BSON.ObjectId[]) => Item[]
 * sortPriceLowToHigh(itemTuple: ItemTuple) => ItemTuple
 * sortPriceHighToLow(itemTuple: ItemTuple) => ItemTuple
 * sortLeastToMostRecent(itemTuple: ItemTuple) => ItemTuple
 * sortMostToLeastRecent(itemTuple: ItemTuple) => ItemTuple
 * 
 * Accounts:
 * getAccountById(id: BSON.ObjectId) => Account
 * getAccountByUsername(username: string) => Account
 * ifUsernameAlreadyExists(username: string) => boolean
 * getAllUsernames() => string[]
 * getProfilePhotoByUsername(username: string) => string
 * 
 * 
 * Modify database:
 * addItemToCurrentListings(username: string, itemId: BSON.ObjectId, 
 *    accountsCollection: RemoteMongoCollection<Account>) => void
 * insertNewItem(title: string, description: string, seller: string, category: string, 
 *    subcategory: string, price: number, photoFilenames: string[]) => BSON.ObjectId
 * insertNewAccount(username: string, fullname: string, email: string, bio: string,
      profilePhotoFilename: string, contactInformation: Map<String, String>) => BSON.ObjectId
 * deleteAccountById(accountId: BSON.ObjectId) => void
 * addItemToLikedListings(username: string, itemId: BSON.ObjectId) => void
 * updateItem(id: BSON.ObjectId, newTitle: string, newDescription: string, newSeller: string,
 *    newCategory: string, newSubcategory: string, newPrice: number, 
 *    newPhotoFilenames: string[]) => void
 * updateAccount(id: BSON.ObjectId, newUsername: string, newFullname: string, 
 *    newEmail: string, newBio: string, newProfilePhotoFilename: string, 
 *    newContactInformation: Map<String, String>) => void
 * markItemAsSold(id: BSON.ObjectId)
 */

/**
 * Call this function ONCE at the begginging of a .tsx file to connect to the client.
 * Will error if run this method multiple times (cannot connect to client multiple times).
 */
export const initializeStitchClient = () => {
  if (!client) {
    //connects to Stitch app that hosts database
    const appId = "artists_corner_0-lcspi";
    client = Stitch.hasAppClient(appId)
      ? Stitch.getAppClient(appId)
      : Stitch.initializeAppClient(appId);

    mongodb = client.getServiceClient(
      RemoteMongoClient.factory,
      "mongodb-atlas"
    );
  }
};

/**
 * Retrieve all items from database
 * @returns tuple of [masterItems, soldItems] of all items
 */
export async function getAllItems(): Promise<ItemTuple> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Retrieves master_items collection
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterItemsCursor = masterItemsCollection.find();
    const master_Items: Item[] = await masterItemsCursor.toArray();

    // Retrieves sold_items collection
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldItemsCursor = soldItemsCollection.find();
    const sold_Items: Item[] = await soldItemsCursor.toArray();

    // Returns item collections as tuple
    return [master_Items, sold_Items];
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

/**
 * Retrieves items from database from a specific category
 * @param category string (insensitive) of category want to search for
 * @returns tuple of [masterItems, soldItems] of items in that category
 */
export async function getItemsByCategory(category: string): Promise<ItemTuple> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Searches for items that match category in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterCategoryItemsCursor = masterItemsCollection.find({
      category: { $regex: category, $options: "i" }, // "i" is for case insensitive
    });
    const masterCategoryItems: Item[] =
      await masterCategoryItemsCursor.toArray();

    // Searches for items that match category in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldCategoryItemsCursor = soldItemsCollection.find({
      category: { $regex: category, $options: "i" },
    });
    const soldCategoryItems: Item[] = await soldCategoryItemsCursor.toArray();

    return [masterCategoryItems, soldCategoryItems];
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

/**
 * Retrieves items from database from a specific category and subcategory
 * @param category string (insensitive) of category want to search for
 * @param subcategory string (insensitive) of subcatefory want to search for -- must be INSIdE
 * category, or list will be empty, because searches for both category and subcategory match
 * @returns tuple of [masterItems, soldItems] of items in that category
 */
export async function getItemsByCategoryAndSubcategory(
  category: string,
  subcategory: string
): Promise<ItemTuple> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Searches for items that match both category and subcategory in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterCategoryAndSubcategoryItemsCursor = masterItemsCollection.find({
      category: { $regex: category, $options: "i" },
      subcategory: { $regex: subcategory, $options: "i" },
    });
    const masterCategoryAndSubcategoryItems: Item[] =
      await masterCategoryAndSubcategoryItemsCursor.toArray();

    // Searches for items that match both category and subcategory in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldCategoryAndSubcategoryItemsCursor = soldItemsCollection.find({
      category: { $regex: category, $options: "i" },
      subcategory: { $regex: subcategory, $options: "i" },
    });
    const soldCategoryAndSubcategoryItems: Item[] =
      await soldCategoryAndSubcategoryItemsCursor.toArray();

    return [masterCategoryAndSubcategoryItems, soldCategoryAndSubcategoryItems];
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

/**
 * Retrieves items from database from a ONLY a subcategory
 * @param subcategory string (insensitive) of subcategory want to search for
 * @returns tuple of [masterItems, soldItems] of items in that subcategory
 */
export async function getItemsBySubcategory(
  subcategory: string
): Promise<ItemTuple> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Searches for items with same subcategory in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterSubcategoryItemsCursor = masterItemsCollection.find({
      subcategory: { $regex: subcategory, $options: "i" },
    });
    const masterSubcategoryItems: Item[] =
      await masterSubcategoryItemsCursor.toArray();

    // Searches for items with same subcategory in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldSubcategoryItemsCursor = soldItemsCollection.find({
      subcategory: { $regex: subcategory, $options: "i" },
    });
    const soldSubcategoryItems: Item[] =
      await soldSubcategoryItemsCursor.toArray();

    return [masterSubcategoryItems, soldSubcategoryItems];
  } catch (error) {
    console.error("Error fetching items:", error);
    return [];
  }
}

/**
 * Helper function to calculate scores for each item depending on search query
 * For each keyword: partial word matches get a score of 0.5 an full word matches
 * get a score of 1, 0 if no match. Then, we a sum up the keyword scores
 * for an item's total score.
 *
 * @param item want to calculate score for
 * @param keywordArray keywords want to search for (split by spaces in query)
 * @param dollarAmount dollar amount searched for
 * @returns total score item
 */
function calculateScore(
  item: Item,
  keywordArray: string[],
  dollarAmount: number
): number {
  const keywordMatches = (keywordRegex: RegExp): number => {
    return (
      (item.title?.match(keywordRegex) || []).length +
      (item.description?.match(keywordRegex) || []).length +
      (item.category?.match(keywordRegex) || []).length +
      (item.subcategory?.match(keywordRegex) || []).length +
      (item.seller?.match(keywordRegex) || []).length +
      (item.price >= dollarAmount - 1 && item.price <= dollarAmount + 1 ? 1 : 0)
    );
  };

  const totalScore = keywordArray.reduce((acc, keyword) => {
    const keywordRegexBounded = new RegExp(`\\b${keyword}\\b`, "gi");
    const keywordRegexUnbounded = new RegExp(keyword, "gi");

    const boundedMatches = keywordMatches(keywordRegexBounded);
    const unboundedMatches = keywordMatches(keywordRegexUnbounded);

    let keywordScore = 0;

    if (boundedMatches > 0) {
      keywordScore = 1;
    } else if (boundedMatches === 0 && unboundedMatches > 0) {
      keywordScore = 0.5;
    }
    return acc + keywordScore;
  }, 0);

  return totalScore;
}

/**
 * Retrieves items from the database based on search string
 * @param keywords string (insensitive) of keyword(s) to search for
 * @returns tuple of [masterItems, soldItems] of items with that keyword, sorted by the number of matches
 */
export async function searchItems(keywords: string): Promise<ItemTuple> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    // Access the MongoDB database
    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Extract dollar amount from keywords
    const dollarAmount = parseInt(
      keywords.replace(/\$([\d]+)(\.\d{1,2})?/, "$1")
    );
    // Split keywords by spaces
    const keywordArray = keywords.split(/\s+/);

    // Helper function to create search query for a keyword
    const createSearchQuery = (keyword: string) => ({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { category: { $regex: keyword, $options: "i" } },
        { subcategory: { $regex: keyword, $options: "i" } },
        { seller: { $regex: keyword, $options: "i" } },
        { price: { $gt: dollarAmount - 1, $lt: dollarAmount + 1 } },
      ],
    });
    const searchQuery = {
      $or: keywordArray.map(createSearchQuery),
    };

    // Searches for item with id in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterSearchResults: Item[] = await masterItemsCollection
      .find(searchQuery)
      .toArray();

    // Searches for item with id in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldSearchResults: Item[] = await soldItemsCollection
      .find(searchQuery)
      .toArray();

    // Calculate scores and sort results if there is more than one keyword
    if (keywordArray.length > 1) {
      // Sort and return the results
      const sortResults = (results: Item[]) =>
        results
          .map((item) => ({
            item,
            score: calculateScore(item, keywordArray, dollarAmount),
          }))
          .sort((a, b) => b.score - a.score)
          .map((result) => result.item);

      return [sortResults(masterSearchResults), sortResults(soldSearchResults)];
    }

    // Return unsorted results when there is only one keyword
    return [masterSearchResults, soldSearchResults];
  } catch (error) {
    console.error("Error fetching items:", error);
    return [[], []];
  }
}

/**
 * Retrieves items from database from its object id
 * @param id object id -- if have string of id use new BSON.ObjectId([string]) and make sure
 * BSON is imported from mongodb-stitch-browser-sdk
 *
 * Object Id must be a 24 character hex string, 12 byte binary Buffer, or a number
 * or else it will error (for simplicity, we use a 24 character hex string).
 *
 * @returns Item with object id or undefined if error -- no or multiple items with id
 */
export async function getItemById(
  id: BSON.ObjectId
): Promise<Item | undefined> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Searches for item with id in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterItem: Item[] = await masterItemsCollection
      .find({
        _id: id,
      })
      .toArray();

    // Searches for item with id in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldItem: Item[] = await soldItemsCollection
      .find({
        _id: id,
      })
      .toArray();

    // return item or appropriate errors if no item found/multiple found
    if (masterItem.length === 0 && soldItem.length === 0) {
      console.error("No item with Object Id");
      return undefined;
    } else if (masterItem.length === 1 && soldItem.length === 0) {
      return masterItem[0];
    } else if (soldItem.length === 1 && masterItem.length === 0) {
      return soldItem[0];
    } else {
      console.error("Multiple items with Object Id");
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching item by Id:", error);
    return undefined;
  }
}

/**
 * Returns Item[] from BSON.ObjectId[] -- use for account fields
 * currentListing_ids, pastListing_ids, purchasedItems_ids,
 * likedItem_ids
 * @param itemIds list of BSON.ObjectIds want to return item values of
 * @returns item[] from object ids
 */
export async function getItemListById(
  itemIds: BSON.ObjectId[]
): Promise<Item[]> {
  //map helper of finding id to each item in list
  const itemPromises = itemIds.map(getItemById);
  const itemList = await Promise.all(itemPromises);
  return itemList.filter((item): item is Item => !!item);
}

/**
 * Helper for sorting prices from low to high
 * @param items an item[] to sort
 * @returns items[] sorted with price low to high
 */
function sortPriceLowToHighHelper(items: Item[]): Item[] {
  return items.slice().sort((a, b) => a.price - b.price);
}

/**
 * Sorts (master_items, sold_items) tuple price low to high using helper
 * @param itemTuple a (item[], item[]) expressed in the format (master_items, sold_items)
 * @returns a tuple, but with both item lists seperately sorted with price low to high
 *
 * If want to sort a Item[] seperately, make the helper an export function and use that.
 *
 */
export function sortPriceLowToHigh(itemTuple: ItemTuple): ItemTuple {
  if (itemTuple[0] && itemTuple[1]) {
    return [
      sortPriceLowToHighHelper(itemTuple[0]), // Master Items
      sortPriceLowToHighHelper(itemTuple[1]), // Sold Items
    ];
  } else {
    console.log("Invalid ItemTuple entered to sort");
    return [[], []];
  }
}

/**
 * Helper for sorting prices from high to low
 * @param items an item[] to sort
 * @returns items[] sorted with price high to low
 */
function sortPriceHighToLowHelper(items: Item[]): Item[] {
  return items.slice().sort((a, b) => b.price - a.price);
}

/**
 * Sorts (master_items, sold_items) tuple price high to low using helper
 * @param itemTuple a (item[], item[]) expressed in the format (master_items, sold_items)
 * @returns a tuple, but with both item lists seperately sorted with price high to low
 *
 * If want to sort a Item[] seperately, make the helper an export function and use that.
 *
 */
export function sortPriceHighToLow(itemTuple: ItemTuple): ItemTuple {
  if (itemTuple[0] && itemTuple[1]) {
    return [
      sortPriceHighToLowHelper(itemTuple[0]), // Master Items
      sortPriceHighToLowHelper(itemTuple[1]), // Sold Items
    ];
  } else {
    console.log("Invalid ItemTuple entered to sort");
    return [[], []];
  }
}

/**
 * Helper for sorting timestamps from least recent to most recent
 * @param items an item[] to sort
 * @returns items[] sorted with timestamps from least recent to most recent
 */
function sortLeastToMostRecentHelper(items: Item[]): Item[] {
  return items.slice().sort((a, b) => {
    // Convert timestamps into dates and compare
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return aTime - bTime;
  });
}

/**
 * Sorts (master_items, sold_items) tuple timestamps from least recent to most recent using helper
 * @param itemTuple a (item[], item[]) expressed in the format (master_items, sold_items)
 * @returns a tuple, but with both item lists seperately sorted with timestamps from least recent
 * to most recent
 *
 * If want to sort a Item[] seperately, make the helper an export function and use that.
 *
 */
export function sortLeastToMostRecent(itemTuple: ItemTuple): ItemTuple {
  if (itemTuple[0] && itemTuple[1]) {
    return [
      sortLeastToMostRecentHelper(itemTuple[0]), // Master Items
      sortLeastToMostRecentHelper(itemTuple[1]), // Sold Items
    ];
  } else {
    console.log("Invalid ItemTuple entered to sort");
    return [[], []];
  }
}

/**
 * Helper for sorting timestamps from most recent to least recent
 * @param items an item[] to sort
 * @returns items[] sorted with timestamps from most recent to least recent
 */
function sortMostToLeastRecentHelper(items: Item[]): Item[] {
  return items.slice().sort((a, b) => {
    // Convert timestamps into dates and compare
    const aTime = new Date(a.timestamp).getTime();
    const bTime = new Date(b.timestamp).getTime();
    return bTime - aTime;
  });
}

/**
 * Sorts (master_items, sold_items) tuple timestamps from most recent to least recent using helper
 * @param itemTuple a (item[], item[]) expressed in the format (master_items, sold_items)
 * @returns a tuple, but with both item lists seperately sorted with timestamps from most recent
 * to least recent
 *
 * If want to sort a Item[] seperately, make the helper an export function and use that.
 *
 */
export function sortMostToLeastRecent(itemTuple: ItemTuple): ItemTuple {
  if (itemTuple[0] && itemTuple[1]) {
    return [
      sortMostToLeastRecentHelper(itemTuple[0]), // Master Items
      sortMostToLeastRecentHelper(itemTuple[1]), // Sold Items
    ];
  } else {
    console.log("Invalid ItemTuple entered to sort");
    return [[], []];
  }
}

/**
 * Retrieves an account from database from its object id
 * @param id object id -- if have string of id use new BSON.ObjectId([string]) and make sure
 * BSON is imported from mongodb-stitch-browser-sdk
 *
 * Obejct Id must be a 24 character hex string, 12 byte binary Buffer, or a number
 * or else it will error (for simplicity, we use a 24 character hex string).
 *
 * @returns Account with object id or undefined if error -- no or multiple accounts with id
 */
export async function getAccountById(
  id: BSON.ObjectId
): Promise<Account | undefined> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Access accounts collection and find account by id
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");
    const account: Account[] = await accountsCollection
      .find({
        _id: id,
      })
      .toArray();

    // Return account if found or appropiate error if none found/multiple found
    if (account.length === 0) {
      console.error("No account with Object Id");
      return undefined;
    } else if (account.length === 1) {
      return account[0];
    } else {
      console.error("Multiple accounts with Object Id");
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching account by Id:", error);
    return undefined;
  }
}

/**
 * Retrieves an account from database from its username
 * @param username account username/seller username
 * @returns Account with username or undefined if error -- no or multiple accounts with username
 */
export async function getAccountByUsername(
  username: string
): Promise<Account | undefined> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Access accounts collection and find account by username
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");
    const account: Account[] = await accountsCollection
      .find({
        username: username,
      })
      .toArray();

    // Return account if found or appropiate error if none found/multiple found
    if (account.length === 0) {
      console.error("No account with username");
      return undefined;
    } else if (account.length === 1) {
      return account[0];
    } else {
      console.error("Multiple accounts with username");
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching account by username:", error);
    return undefined;
  }
}

/**
 * Returns is username already exists in database -- use when creating a new account,
 * checking if username doesn't already exist
 * @param username string want to check if already username of another account
 * @returns boolean of if username already being used
 */
export async function ifUsernameAlreadyExists(
  username: string
): Promise<boolean> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Find if any account with username exists
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");
    const account: Account | null = await accountsCollection.findOne({
      username: username,
    });

    return account != null;
  } catch (error) {
    console.log("Error fetching account by username:", error);
    return false;
  }
}

/**
 * Retrieves all usernames from database
 * @returns a string[] of all available usernames in database
 */
export async function getAllUsernames(): Promise<string[]> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Retrieves accounts collection
    const accountsCollection: RemoteMongoCollection<any> =
      db.collection("accounts");

    // Find all documents in the accounts collection, projecting only the "username" field
    const accountsCursor = accountsCollection.find(
      {},
      { projection: { username: 1 } }
    );

    // Extract usernames from the accounts
    const usernamesArray = await accountsCursor.toArray();
    const usernames: string[] = usernamesArray.map((user) => user.username);

    return usernames;
  } catch (error) {
    console.error("Error fetching usernames:", error);
    return [];
  }
}

/**
 * Retrieves the profile photo filename for an account from the database based on its username
 * @param username Account username
 * @returns Profile photo filename or undefined if error -- no or multiple accounts with username
 */
export async function getProfilePhotoByUsername(
  username: string
): Promise<string | undefined> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Access accounts collection and find account by username with projection
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    const result: Account | null = await accountsCollection.findOne({
      username: username,
    });

    // Return profile photo filename if found or appropriate error if none found/multiple found
    if (result && result.profilePhotoFilename) {
      return result.profilePhotoFilename;
    } else {
      console.error(
        "No account with username or missing profile photo filename"
      );
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching profile photo by username:", error);
    return undefined;
  }
}

/**
 * Helper for adding a new item, adds the item Object Id to seller's
 * current listings
 * @param username seller's username
 * @param itemId Object Id of new item that was added
 * @param accountsCollection send in accounts collection so that don't
 * have to use API key again and access database again
 */
async function addItemToCurrentListings(
  username: string,
  itemId: BSON.ObjectId,
  accountsCollection: RemoteMongoCollection<Account>
): Promise<void> {
  try {
    // Update the account in the collection to include object id of item
    const result = await accountsCollection.updateOne(
      { username: username },
      { $push: { currentListing_ids: itemId } }
    );

    // Check if insertion successful
    if (result.matchedCount === 1 && result.modifiedCount === 1) {
      console.log(`Item added to current listings for seller ${username}`);
    } else {
      console.log(`Could not find username ${username} for seller`);
    }
  } catch (error) {
    console.error("Error adding item to seller's current listings:", error);
  }
}

/**
 * Inserts new item into master_items collection
 * @param title of new item
 * @param description of new item
 * @param seller username of new item
 * @param category of new item
 * @param subcategory of new item
 * @param price of new item
 * @param photoFilenames string[] of new item
 *
 * USE CAREFULLY WHEN TESTING, DELETE ALL ITEMS THAT YOU ADD
 * TO KEEP MOCKING CONSISTENT
 */
export async function insertNewItem(
  title: string,
  description: string,
  seller: string,
  category: string,
  subcategory: string,
  price: number,
  photoFilenames: string[]
): Promise<BSON.ObjectId | undefined> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Access collections
    const itemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    const newItem: Item = {
      title: title,
      description: description,
      seller: seller,
      category: category,
      subcategory: subcategory,
      price: price,
      timestamp: new Date(), // Date returns current time
      photoFilenames: photoFilenames,
      ifSold: false,
    };

    // Add new item to master_items
    const result = await itemsCollection.insertOne(newItem);

    if (!result.insertedId) {
      throw new Error("Failed to insert item. Inserted Id is undefined.");
    }

    console.log(`Successfully inserted item with id: ${result.insertedId}`);

    // Add item to seller's current listings
    await addItemToCurrentListings(
      seller,
      result.insertedId,
      accountsCollection
    );

    return result.insertedId;
  } catch (error) {
    console.error("Failed to insert item:", error);
    return undefined;
  }
}

/**
 * Inserts new account into accounts collection
 * @param username of new account -- first check if username already available
 * before call this function
 * @param fullname of new account
 * @param email of new account -- use brown email
 * @param bio of new account
 * @param profilePhotoFilename of new account
 * @param contactInformation of new account -- ALWAYS INCLUDE "EMAIL":EMAIL
 * KEY:VALUE PAIR, IF USER DOES NOT INCLUDE ANY EXTRAS
 *
 * Include multiple slots, for each drop down menu of options including instagram,
 * phone number, facebook, twitter, etc. but have email as already included and
 * non-modifiable
 *
 * AGAIN, USE CAREFULLY WHEN TESTING, DELETE ALL AACOUNTS THAT YOU ADD
 * TO KEEP MOCKING CONSISTENT
 *
 */
export async function insertNewAccount(
  username: string,
  fullname: string,
  email: string,
  bio: string,
  profilePhotoFilename: string,
  contactInformation: Map<String, String>
): Promise<BSON.ObjectId | undefined> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    const newAccount: Account = {
      username: username,
      fullname: fullname,
      email: email,
      bio: bio,
      currentListing_ids: [],
      pastListing_ids: [],
      purchasedItem_ids: [],
      likedItem_ids: [],
      profilePhotoFilename: profilePhotoFilename,
      contactInformation: Object.fromEntries(contactInformation),
    };

    // Add new account to collection
    const result = await accountsCollection.insertOne(newAccount);

    if (!result.insertedId) {
      throw new Error("Failed to insert account. Inserted Id is undefined.");
    }

    console.log(`Successfully inserted account with _id: ${result.insertedId}`);

    return result.insertedId;
  } catch (error) {
    console.error("Failed to insert account:", error);
    return undefined;
  }
}

/**
 * Removes an item from the collection based on its object Id
 * @param accountId The object Id of the item to be removed
 */
export async function deleteItemById(id: BSON.ObjectId): Promise<void> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Searches for item with id in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterItem: Item | null = await masterItemsCollection.findOne({
      _id: id,
    });

    // Searches for item with id in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldItem: Item | null = await soldItemsCollection.findOne({
      _id: id,
    });

    // Access accounts collection
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    // delete item or appropriate errors if no item found/multiple found
    if (!masterItem && !soldItem) {
      console.error("No item with Object Id");
    } else if (masterItem && !soldItem) {
      await masterItemsCollection.deleteOne({ _id: id });
      console.log("Successfully deleted item");
      await accountsCollection.updateOne(
        { username: masterItem.seller },
        { $pull: { currentListing_ids: id } }
      );
      console.log("Successfully removed item from seller's current listings");
    } else if (soldItem && !masterItem) {
      await soldItemsCollection.deleteOne({ _id: id });
      console.log("Successfully deleted item");
      await accountsCollection.updateOne(
        { username: soldItem.seller },
        { $pull: { pastListing_ids: id } }
      );
      console.log("Successfully removed item from seller's current listings");
    } else {
      console.error("Multiple items with Object Id");
    }
  } catch (error) {
    console.error("Error deleting item by Id:", error);
  }
}

/**
 * Removes an account from the collection based on its object Id
 * @param accountId The object Id of the account to be removed
 */
export async function deleteAccountById(
  accountId: BSON.ObjectId
): Promise<void> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    // Remove the account from collaction based on its object Id
    const result = await accountsCollection.deleteOne({ _id: accountId });

    // Check if the deletion was successful
    if (result.deletedCount === 1) {
      console.log(`Account with Id ${accountId} removed from the collection.`);
    } else {
      console.error(
        `Failed to remove account with Id ${accountId} from the collection.`
      );
    }
  } catch (error) {
    console.error("Error removing account:", error);
  }
}

/**
 * Adds item to account's liked items by username
 * @param username of account
 * @param itemId liked item's Object Id
 */
export async function addItemToLikedListings(
  username: string,
  itemId: BSON.ObjectId
): Promise<void> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    // Update the account's liked items list to include object id of new item
    const result = await accountsCollection.updateOne(
      { username: username },
      { $push: { likedItem_ids: itemId } }
    );

    // Check if update successful
    if (result.matchedCount === 1 && result.modifiedCount === 1) {
      console.log(`Item added to liked items for ${username}`);
    } else {
      console.log(`Could not find username ${username}`);
    }
  } catch (error) {
    console.error("Error adding item to user's liked items:", error);
  }
}

/**
 * Update item info
 * @param id BSON.ObjectId of item want to update
 * @param newTitle of item
 * @param newDescription of item
 * @param newSeller of item
 * IF USER CHANGES USERNAME, USE THIS FUNCTION TO UPDATE ALL ITEMS WITH
 * NEW USERNAME
 * @param newCategory of item
 * @param newSubcategory of item
 * @param newPrice of item
 * @param newPhotoFilenames of item -- use when want to add a new photo or remove
 *
 * When want to only change one field, send in old feilds + the new field.
 */
export async function updateItem(
  id: BSON.ObjectId,
  newTitle: string,
  newDescription: string,
  newSeller: string,
  newCategory: string,
  newSubcategory: string,
  newPrice: number,
  newPhotoFilenames: string[]
): Promise<void> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Try to find item with object id in master_items
    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const masterItem: Item | null = await masterItemsCollection.findOne({
      _id: id,
    });

    // Try to find item with object id in sold_items
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const soldItem: Item | null = await soldItemsCollection.findOne({
      _id: id,
    });

    // Update item in respective collection, error if none found
    if (masterItem != null && soldItem == null) {
      const result = await masterItemsCollection.updateOne(
        { _id: id },
        {
          $set: {
            title: newTitle,
            description: newDescription,
            seller: newSeller,
            category: newCategory,
            subcategory: newSubcategory,
            price: newPrice,
            photoFilenames: newPhotoFilenames,
          },
        }
      );
      if (result.matchedCount === 1 && result.modifiedCount === 1) {
        console.log(`Item successfully updated`);
      } else {
        console.log("Could not update item with id " + id.toString());
      }
    } else if (soldItem != null && masterItem == null) {
      const result2 = await soldItemsCollection.updateOne(
        { _id: id },
        {
          $set: {
            title: newTitle,
            description: newDescription,
            seller: newSeller,
            category: newCategory,
            subcategory: newSubcategory,
            price: newPrice,
            photoFilenames: newPhotoFilenames,
          },
        }
      );
      if (result2.matchedCount === 1 && result2.modifiedCount === 1) {
        console.log(`Item successfully updated`);
      } else {
        console.log("Could not update item with id " + id.toString());
      }
    } else {
      console.log("No item with id " + id.toString());
    }
  } catch (error) {
    console.error("Error in updating item:", error);
  }
}

/**
 * Update account information
 * @param id account BSON.ObjectId
 * @param newUsername of account
 * IF CHANGING USERNAME OF ACCOUNT, CHECK SEPERATELY IF USERNAME ALREADY EXISTS.
 * @param newFullname of account
 * @param newEmail of account
 * @param newBio of account
 * @param newProfilePhotoFilename of account
 * @param newContactInformation of account
 * IF ADDING NEW CONTACT, GET EXISTING MAP AND ADD, THEN SEND IN AS INPUT
 *
 */
export async function updateAccount(
  id: BSON.ObjectId,
  newUsername: string,
  newFullname: string,
  newEmail: string,
  newBio: string,
  newProfilePhotoFilename: string,
  newContactInformation: Map<String, String>
): Promise<void> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    // Find account from abject id
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");
    const account: Account | null = await accountsCollection.findOne({
      _id: id,
    });

    // Update account if found or error if none found
    if (account != null) {
      const result = await accountsCollection.updateOne(
        { _id: id },
        {
          $set: {
            username: newUsername,
            fullname: newFullname,
            email: newEmail,
            bio: newBio,
            profilePhotoFilename: newProfilePhotoFilename,
            contactInformation: Object.fromEntries(newContactInformation),
          },
        }
      );
      if (result.matchedCount === 1 && result.modifiedCount === 1) {
        console.log(`Account successfully updated`);
      } else {
        console.log("Could not update item with id " + id.toString());
      }
    } else {
      console.log("No account with id " + id.toString());
    }
  } catch (error) {
    console.error("Error in updating account:", error);
  }
}

/**
 * Marks item as sold by: moving it from master_items to sold_items
 * and moving from seller's current listings to past listings
 * @param id item want to mark as sold
 *
 * USE CAREFULLY WHEN TESTING TO PRESERVE MOCKING
 *
 */
export async function markItemAsSold(id: BSON.ObjectId): Promise<void> {
  try {
    // Ensure the client is authenticated
    await client?.auth.loginWithCredential(
      new UserApiKeyCredential(ACCESS_TOKEN)
    );

    const db = mongodb?.db("artists_corner_pvd");
    if (!db) {
      throw new Error("Database not available");
    }

    const masterItemsCollection: RemoteMongoCollection<Item> =
      db.collection("master_items");
    const soldItemsCollection: RemoteMongoCollection<Item> =
      db.collection("sold_items");
    const accountsCollection: RemoteMongoCollection<Account> =
      db.collection("accounts");

    // Find the item in the master_items collection
    const itemToUpdate: Item | null = await masterItemsCollection.findOne({
      _id: id,
    });

    if (!itemToUpdate) {
      console.error(`Item with id ${id} not found in master_items`);
    } else {
      // Remove the item from master_items
      await masterItemsCollection.deleteOne({ _id: id });

      // Mark the item as sold and move it to sold_items
      const updatedItem: Item = { ...itemToUpdate, ifSold: true };
      await soldItemsCollection.insertOne(updatedItem);
      console.log(
        `Sucessfully moved item with id ${id} to sold items collection`
      );

      // Find the seller's account
      const sellerAccount: Account | null = await accountsCollection.findOne({
        username: updatedItem.seller,
      });

      if (!sellerAccount) {
        console.log(
          `Account with seller's username ${updatedItem.seller} not found`
        );
      } else {
        // Remove item from seller's current listings
        await accountsCollection.updateOne(
          { username: updatedItem.seller },
          { $pull: { currentListing_ids: id } }
        );
        // Add item to seller's past listings
        await accountsCollection.updateOne(
          { username: updatedItem.seller },
          { $push: { pastListing_ids: id } }
        );
        console.log(
          `Sucessfully updated seller's account to mark item with id ${id} as sold`
        );
      }
    }
  } catch (error) {
    console.error(
      ` Error marking item with id ${id.toString()} as sold:`,
      error
    );
  }
}
