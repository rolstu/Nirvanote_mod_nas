import { Request, Response, NextFunction } from "express";
import { FiveQuestion, Question, ThreeQuestion } from "../models/Question";
import { insertTasks } from "../models/Task";
import logger from "../utils/logger";


export async function taskAssignmentsHandler(
    req: Request,
    res: Response,
    next: NextFunction) {
        try{
            const task = req.body.data.task;
            const workFlowType = req.body.data.workflow.id;
            logger.info(`\nTASK ASSIGNMENT BODY\n\t${JSON.stringify(req.body)}`);
            logger.info(`\nTASK ASSIGNMENT DATA\n\t${JSON.stringify(req.body.data)}`);
            let workFlowNumber: number = 1;
            
            if(workFlowType == 1){
                workFlowNumber = 1;
            }else if(workFlowType == 2){
                workFlowNumber = 2;
            }
            const taskAssignments = req.body.data.task_assignments;
            await insertTasks(taskAssignments, workFlowNumber);
            res.status(200).json({
                message: "OK",
            });
        }catch(error){
            logger.error(`TASK ASSIGNMENTS ERROR\n\t${error}`);
            res.status(500).json({
                error: error,
            });
            next(error);
        }
}


export async function getQuestions(
    req: Request,
    res: Response,
    next: NextFunction
){
    try{
        const threeQuestionData = await ThreeQuestion.getThreeQuestions();
        const threeQuestions: Array<Question> = threeQuestionData.map((question: Question)=> {
            return {
                name: question.name,
                uuid: question.uuid,
                order: question.order
            }
        });
        const threeQuestion: ThreeQuestion = new ThreeQuestion('en',threeQuestions);
        const resultThreeQuestion = await ThreeQuestion.insertThreeQuestion(threeQuestion);
        const fiveQuestionData = await FiveQuestion.getFiveQuestions();
        const fiveQuestions: Array<Question> = fiveQuestionData.map((question: Question) => {
            return {
                name: question.name,
                uuid: question.uuid,
                order: question.order
            }
        });
        const fiveQuestion: FiveQuestion = new FiveQuestion('en', fiveQuestions);
        const result = await FiveQuestion.insertFiveQuestion(fiveQuestion);
        res.status(200).json([threeQuestion, fiveQuestion])
        
    }catch(error){
        logger.error(`getQuestions ERROR\n\t${error}`); 
        next(error);
    }
}