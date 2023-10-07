import axios from "axios";
import { getDb } from "../utils/db";
import { fiveQuestionAPI, threeQuestionAPI } from "../utils/integration_utils";
import logger from "../utils/logger";

export const threeQuestionCollection = "threeQuestionCollection";
export const fiveQuestionCollection = "fiveQuestionCollection";

export interface Question {
  name: string;
  uuid: string;
  order: number;
}

export class ThreeQuestion {
  lang: string;
  questions: Array<Question>;
  constructor(lang: string, questions: Array<Question>) {
    this.lang = lang;
    this.questions = questions;
  }

  static async insertThreeQuestion(
    threeQuestion: ThreeQuestion
  ): Promise<void> {
    try{
        if (threeQuestion.questions.length != 4) {
            return;
          }
          await getDb().collection(threeQuestionCollection).insertOne(threeQuestion);
    }catch(error){
        logger.error(`insertThreeQuestion Error\n\t${error}`);
    }
  }

  static async getThreeQuestionByLang(lang: string): Promise<any>{
    try{
        let result = await getDb().collection(threeQuestionCollection).findOne({
            lang: lang
        });
        if(result!=null){
            let questions: Array<Question> = result.questions;
            let returnResult = questions.map((question) => {
                return {
                    question_uuid: question.uuid,
                    order: question.order
                }
            });
            return returnResult;
        }
        return null;

    }catch(error){
        logger.error(`getThreeQuestionByLang ERROR\n\t${error}`);
    }
  }

  static async getThreeQuestionUuid(lang: string, order: number) {
    try {
      const result = await getDb()
        .collection(threeQuestionCollection)
        .findOne(
          {
            lang: lang,
          },
          {
            projection: {
              "questions": {
                $elemMatch: {
                  "order": order,
                },
              },
            },
          }
        );
      return result?.questions[0].uuid;
    } catch (error) {
      logger.error(`getThreeQuestionUuid ERROR\n\t${error}`);
    }
  }

  static async getThreeQuestions() {
    try {
      const result = await axios.get(threeQuestionAPI!);
      return result.data;
    } catch (error) {
      logger.error(`getThreeQuestions ERROR\n\t${error}`);
    }
  }
}

export class FiveQuestion {
  lang: string;
  questions: Array<Question>;
  constructor(lang: string, questions: Array<Question>) {
    this.lang = lang;
    this.questions = questions;
  }

  static async insertFiveQuestion(fiveQuestion: FiveQuestion): Promise<void> {
    try{
        if (fiveQuestion.questions.length != 6) {
            return;
          }
          await getDb().collection(fiveQuestionCollection).insertOne(fiveQuestion);

    }
    catch(error){
        logger.error(`insertFiveQuestion ERROR\n\t${error}`);
    }
  }

  static async getFiveQuestionUuid(lang: string, order: number) {
   try{
    const result = await getDb()
    .collection(fiveQuestionCollection)
    .findOne(
      {
        lang: lang,
      },
      {
        projection: {
          "questions": {
            $elemMatch: {
              "order": order,
            },
          },
        },
      }
    );

  return result?.questions[0].uuid;
   }catch(error){
    logger.error(`getFiveQuestionUuid ERROR\n\t${error}`);
   }
  }


  static async getFiveQuestionByLang(lang: string): Promise<any>{
    try{
        let result = await getDb().collection(fiveQuestionCollection).findOne({
            lang: lang
        });
        if(result!=null){
            let questions: Array<Question> = result.questions;
            let returnResult = questions.map((question) => {
                return {
                    question_uuid: question.uuid,
                    order: question.order
                }
            });
            return returnResult;
        }
        return null;

    }catch(error){
        logger.error(`getFiveQuestionByLang ERROR\n\t${error}`);
    }
  }

  static async getFiveQuestions() {
    try {
      const result = await axios.get(fiveQuestionAPI!);
      return result.data;
    } catch (error) {
      logger.error(`getFiveQuestions ERROR\n\t${error}`);
    }
  }
}
