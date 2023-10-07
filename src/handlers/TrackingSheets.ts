import { Request, Response, NextFunction } from "express";
import { TrackingSheet } from "../models/TrackingSheets";

export async function addTrackingSheetHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await TrackingSheet.updateSheetRecord(req.body.sheetId, req.body.sheetF1Name);
    res.status(200).json({
      message: "OK",
    });
  } catch (error) {
    next(error);
  }
}
