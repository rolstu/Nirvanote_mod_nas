import { Request, Response, NextFunction } from "express";
import { SheetF1Row } from "../models/SheetF1";
import { TrackingSheet } from "../models/TrackingSheets";
import { getDb } from "../utils/db";
import { errorCollection, SheetProcessError } from "../utils/errors";
import logger from "../utils/logger";


export async function v3updateDbCacheForSheetHandler(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        let sheetName = req.query.sheetName as string;
        if (sheetName === "" || !sheetName) {
            res.status(406).json({
                message: "Invalid sheetName",
            });
        } else {
            let trackingSheet = await TrackingSheet.queryDb({
                sheetF1Name: `${sheetName}3Q`,
               
            });
            if (trackingSheet.length === 0) {
                res.status(404).json({
                    message: "Sheet not found",
                });
            } else {
                processSheet(trackingSheet[0]);
                res.status(200).json({
                    status: "ok",
                });
            }
        }
    } catch (error) {
        next(error);
    }
}

// Private Functions
async function processSheet(sheet: TrackingSheet) {
    try {
        // Flow1 - Fetch all rows from the sheet
        let highestIndex1 = await SheetF1Row.getHighestIndex();
        let range1: string;
        if (highestIndex1 != null) {
            range1 = `3Q!A${highestIndex1 + 3}:L`;
        } else {
            range1 = `3Q!A2:L`;
        }
        await SheetF1Row.fetchSheet( range1, highestIndex1);
                
    } catch (error) {
        await getDb()
            .collection(errorCollection)
            .insertOne(
                new SheetProcessError(
                    `Error while processing sheet for ${sheet.sheetF1Name.split("3Q")[0]} with id ${sheet.sheetId
                    } with ObjectId ${sheet.id?.toHexString()}`,
                    error
                )
            );
    }
}

