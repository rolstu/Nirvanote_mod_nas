import { Router } from "express";
import {
  
  v3updateDbCacheForSheetHandler
} from "../handlers/Sheet";

export const cronRouter = Router();

cronRouter.post("/v3/fetchDbSheets", v3updateDbCacheForSheetHandler);