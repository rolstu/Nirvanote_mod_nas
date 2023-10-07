require("dotenv").config();

import Express, { NextFunction, Request, Response } from "express";
import { pingRedis } from "./utils/cache";
import { connectToDatabase } from "./utils/db";

import { initializeGcp } from "./utils/gcp";
import { cronRouter as SheetCronRouter } from "./routes/Sheet";
import { router as TrackingRouter } from "./routes/TrackingSheets";
import logger from "./utils/logger";
import { handleWebhookRequest } from "./handlers/webhook";
import { AxiosError } from "axios";

import { getLanguages } from "./utils/language";
import { integrationRouter } from "./routes/Integration";
import bodyParser from 'body-parser';

async function main() {
    try {
        await pingRedis();
        await connectToDatabase();
        await initializeGcp();
        const app = Express();
        app.use(Express.json());
        app.use(bodyParser.json({ limit: '10mb' }));
        app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
        app.get("/");
        app.use("/cron", SheetCronRouter);
        app.use("/api/trackingSheet", TrackingRouter);
        app.use("/integration/assignments", integrationRouter);
        app.use((req: Request, res: Response, next: NextFunction) => {
            next();
        });
        app.post("/webhook", handleWebhookRequest);
        app.get(
            "/health",
            async (req: Request, res: Response, next: NextFunction) => {
                try {
                    res.status(200).json({
                        message: "OK",
                    });
                } catch (error) {
                    next(error);
                }
            }
        );
        let languages = await getLanguages();
        logger.info("Languages Available : " + JSON.stringify(languages))
        app.listen(3000, async () => {
            logger.info("Server started on port 3000");
        });
    } catch (error) {
        if (error instanceof AxiosError) {
            logger.error(`AXIOS ERROR AT APP.JS\n\t${error.toJSON()}`);
        }
        console.error(error);
    }
}

main();
