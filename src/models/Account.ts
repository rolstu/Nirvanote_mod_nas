import { ObjectId } from "mongodb";
import { getDb } from "../utils/db";

export const collectionName = "accounts";

export class Account {
  id?: ObjectId;
  wa_id: string;
  isSecurityAccepted: boolean;

  constructor(wa_id: string, isSecurityAccepted: boolean, id?: ObjectId) {
    this.wa_id = wa_id;
    this.isSecurityAccepted = isSecurityAccepted;
    this.id = id;
  }

  static async updateUser(user: any): Promise<Account> {
    let result = await getDb()
      .collection(collectionName)
      .updateOne(
        {
          wa_id: user.wa_id,
        },
        {
          $set: {
            ...user,
          },
        },
        {
          upsert: true,
        }
      );
    if (result.acknowledged) {
      user.id = result.upsertedId;
      return user as Account;
    } else {
      throw new Error("Failed to update user");
    }
  }

  static async fetchUser(query: any): Promise<Account | null> {
    let result = await getDb().collection(collectionName).find(query).toArray();
    if (result.length > 0) {
      return new Account(
        result[0].wa_id,
        result[0].isSecurityAccepted,
        result[0]._id
      );
    } else {
      return null;
    }
  }
}
