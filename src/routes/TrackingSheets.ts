import { Router } from "express";
import { addTrackingSheetHandler } from "../handlers/TrackingSheets";

export const router = Router();

router.post("/v1", addTrackingSheetHandler);
