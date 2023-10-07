import axios from "axios";
import { Answers, getAnswersByTaskAndTaskAssignmentId } from "../models/Task";
import logger from "./logger";
import { fiveQuestionFileIngestionAPI, fiveQuestionSecret, fiveQuestionUUID, threeQuestionFileIngestionAPI, threeQuestionSecret, threeQuestionUUID } from "./integration_utils";



export enum WorkFlowType {
  FIVEQUESTION = "FIVEQUESTION",
  THREEQUESTION = "THREEQUESTION",
}

export interface RawIngestionData {
  file_name: string;
  file_type: string;
  file: string;
  file_duration: Number;
  district: string;
  state: string;
  vendor: string;
}

export interface IngestionData {
  secret: string;
  data: Array<RawIngestionData>;
}

export async function sendIngestionData(
  rawIngestionData: Array<RawIngestionData>,
  workFlowType: WorkFlowType
): Promise<void> {
  try {
    let url: string = "";
    let secret: string = "";
    switch (workFlowType) {
      case WorkFlowType.FIVEQUESTION:
        url = fiveQuestionFileIngestionAPI!;
        secret = fiveQuestionSecret!;
        break;
      case WorkFlowType.THREEQUESTION:
        url = threeQuestionFileIngestionAPI!;
        secret = threeQuestionSecret!;
        break;
    }
    if (url != "" && secret != "") {
      let headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const ingestionData: IngestionData = {
        secret: secret,
        data: rawIngestionData,
      };
      const { data } = await axios.post(url, ingestionData, {
        headers,
      });
    } else {
      logger.error("URL or SECRET is EMPTY");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = {
        "Error message": error.message,
      };
      logger.error(`SEND INGESTION DATA ERROR\n\t${errorMessage}`);
    } else {
      const errorMessage = {
        "Unexpected error message": error,
      };
      logger.error(`SEND INGESTION DATA ERROR\n\t${errorMessage}`);
    }
  }
}

export async function sendAnswers(taskId: string,taskAssignmentUuid: string, workflowNumber: number): Promise<void> {
  try {
    const answers: Answers | null = await getAnswersByTaskAndTaskAssignmentId(
      taskId,
      taskAssignmentUuid
    );
    if(answers == null){
      return;
    }
    const baseUrl = "https://qc.artpark.in/api/v1/"
    let url: string = "";
    let secret: string = "";
    
    if (workflowNumber == 1){
      url = baseUrl + `${threeQuestionUUID!}/public/answer`;
      secret = threeQuestionSecret!
    }else if(workflowNumber == 2){
      url = baseUrl + `${fiveQuestionUUID!}/public/answer`;
      secret = fiveQuestionSecret!;
    }

    let sendingAnswersData = {
      secret: secret,
      data:{
        ...answers
      }
    }
    logger.info(`URL\n\t${url}\nANSWERS DATA\n\t${JSON.stringify(sendingAnswersData)}`)
    if (url != "" && secret != "") {
      let headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      
      if (answers != null) {
        const { data } = await axios.post(url, sendingAnswersData, {
          headers,
        });
      }
    }
  } catch (error) {
    logger.error(`ANSWERS ERROR\n\t${error}`);
  }
}
