import { ObjectId } from "mongodb";
import { getDb } from "../utils/db";

export const collectionName = "trackingSheets";

export interface TrackingTime {
  updatedAt: Date;
  name: string;
}

export class TrackingSheet {
  id?: ObjectId | null;
  sheetId: string;
  sheetF1Name: string;
  updatedAt: Date;

  constructor(
    sheetId: string,
    sheetF1Name: string,
    updatedAt: Date = new Date(),
    id?: ObjectId | null
  ) {
    this.sheetId = sheetId;
    this.sheetF1Name = sheetF1Name;
    this.updatedAt = updatedAt;
    this.id = id;
  }

  static async updateSheetRecord(
    sheetId: string,
    sheetF1Name: string,
  ): Promise<void> {

    await getDb()
      .collection(collectionName)
      .updateOne(
        {
          $and: [{ sheetId: sheetId }, { sheetF1Name: sheetF1Name }],
        },
        {
          $set: {
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
  }

  static async queryDb(filter: any): Promise<TrackingSheet[]> {
    let result = await getDb().collection(collectionName).find(filter);
    return (await result.toArray()).map((doc: any) => {
      return new TrackingSheet(
        doc.sheetId,
        doc.sheetF1Name,
        doc.updatedAt,
        doc._id
      );
    });
  }
}
