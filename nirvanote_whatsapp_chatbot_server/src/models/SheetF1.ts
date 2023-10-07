import { google } from "googleapis";
import { ObjectId } from "mongodb";
import { getDb } from "../utils/db";
import { getAuthClient } from "../utils/gcp";
import path from "path";
import {RawIngestionData, sendIngestionData, WorkFlowType }  from '../utils/integration'
import { sheetId } from "../utils/integration_utils";

export const gcpDbCacheCollection = "3QAUDIOFILES";

export class SheetF1Row {
  id?: ObjectId;
  rowId: number;
  state: string;
  district: string;
  filename: string;
  fileUrl: string;
  duration: number;
  language: string;

  constructor(
    rowId: number,
    state: string,
    district: string,
    filename: string,
    fileUrl: string,
    duration: number,
    language: string,
    id?: ObjectId
  ) {
    this.rowId = rowId;
    this.state = state;
    this.district = district;
    this.filename = filename;
    this.fileUrl = fileUrl;
    this.duration = duration;
    this.language = language;
    this.id = id;
  }

  static parse(data: any, rowNumber: number): any {
    return new SheetF1Row(
      rowNumber,
      data[0],
      data[1],
      data[2],
      data[3],
      data[4],
      data[5],
      data[6]
    );
  }

  toGoogleSheetsRow(): Array<any> {
    return [
      this.state,
      this.district,
      this.filename,
      this.fileUrl,
      this.duration,
      this.language,
    ];
  }

  static async getHighestIndex(): Promise<number | null> {
    let result = await getDb()
      .collection(`${gcpDbCacheCollection}`)
      .find()
      .sort({ rowId: -1 })
      .limit(1)
      .toArray();
    if (result.length === 0) {
      return null;
    }
    return result[0].rowId;
  }

  static async fetchSheet(
    range: string,
    index: number | null
  ): Promise<void> {
    const authClient = await getAuthClient();
    const googleSheetsInstance = google.sheets({
      version: "v4",
      auth: authClient,
    });
    const result = await googleSheetsInstance.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: sheetId,
      range: range,
    });
    if (result.data.values) {
      const headers: Array<string> = result.data.values[0];
      const data: Array<Array<any>> = result.data.values;
      let rows: Array<SheetF1Row> = [];
      let i = index ? index + 1 : 0;
      data.forEach((row) => {
        rows.push(SheetF1Row.parse(row, i));
        i++;
      });
      let apiData: Array<RawIngestionData> = [];
      data.forEach((singleData) => {
        let district = singleData[1];
        let fileId = singleData[2];
        let fileUrl = singleData[3];
        let fileDuration = Number(singleData[4]);
        let vendor = fileId.split("/")[2];
        let state = path.parse(fileId).base.split("_")[0];
        let fileType = "video";
        let dataObject  = {
          "file_name": fileId,
          "file_type": fileType,
          "file": fileUrl,
          "file_duration": fileDuration,
          "district": district,
          "state": state,
          "vendor": vendor
        };
        apiData.push(dataObject)
      });

      await sendIngestionData(apiData, WorkFlowType.THREEQUESTION);
      await this.setCache(rows);
    }
  }

  

  static async updateQuestion(
    wa_id: string,
    number: string,
    response: string,
    id: string,
   
  ): Promise<void> {
    let setQuery: any = {
      "questions.$.response": response,
    };
   
    let result = await getDb()
      .collection(`${gcpDbCacheCollection}`)
      .updateOne(
        {
          reviewerNumber: wa_id,
          "questions.number": number,
          _id: new ObjectId(id),
        },
        {
          $set: setQuery,
        }
      );
    if (!result.acknowledged) {
      throw new Error("Question not found");
    }
  }

  static async updateSheet(
    sheetId: string,
    range: string,
    values: Array<Array<any>>
  ): Promise<void> {
    const authClient = await getAuthClient();
    const googleSheetsInstance = google.sheets({
      version: "v4",
      auth: authClient,
    });
    const result = await googleSheetsInstance.spreadsheets.values.update({
      auth: authClient,
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: values,
      },
    });
  }

  static async setCache(data: SheetF1Row[]): Promise<void> {
    const db = getDb().collection(`${gcpDbCacheCollection}`);
    await db.insertMany(data);
  }

  static async queryDb( filter: any): Promise<SheetF1Row[]> {
    const db = getDb().collection(`${gcpDbCacheCollection}`);
    const result = await db.find(filter).toArray();
    return result.map((row) => {
      return new SheetF1Row(
        row.rowId,
        row.state,
        row.district,
        row.filename,
        row.fileUrl,
        row.duration,
        row.language,
        row._id
      );
    });
  }

  static async updateDoc(
    id: string,
    query: any
  ): Promise<void> {
    const db = getDb().collection(`${gcpDbCacheCollection}`);
    let result = await db.updateOne({ _id: new ObjectId(id) }, { $set: query });
  }
}
