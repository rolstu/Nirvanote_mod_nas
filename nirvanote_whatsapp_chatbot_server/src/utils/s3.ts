import { S3 } from "aws-sdk";
import { String } from "aws-sdk/clients/cloudtrail";
import { createWriteStream, writeFile, writeFileSync } from "fs";
import logger from "./logger";

let s3: S3 | null = null;

export async function initializeS3SDK(): Promise<void> {
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.S3_AWS_REGION
  ) {
    throw new Error("AWS credentials not found");
  }
  s3 = new S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.S3_AWS_REGION,
  });
}

export async function downloadFile(filepath: string): Promise<string> {
  let saveFileName = filepath.split("/").pop();
  let inputStream = s3!
    .getObject({
      Bucket: "nrnotedev",
      Key: filepath,
    })
    .createReadStream();
  let outputStream = createWriteStream(`__tmp__/${saveFileName}`);
  inputStream.pipe(outputStream);
  let filePath = await new Promise<String>((resolve, reject) => {
    outputStream.on("close", () => {
       resolve(`__tmp__/${saveFileName}`);
    });
    outputStream.on('error',(err)=> {
      logger.error(`S3 outputStream ERROR\n\t${err}`)
      reject(err)
    })
  });
  return filePath;
}
