import { ObjectId } from "mongodb";
import { getDb } from "../utils/db";
import { FiveQuestion, ThreeQuestion } from "./Question";
import logger from "../utils/logger";

export const tasksCollection = "ASSIGNEDAUDIOFILES";

export class QuestionAndResponse {
  question_uuid: string;
  order: number;
  answer: string | null;
  constructor(question_uuid: string, order: number,answer: string) {
    this.question_uuid = question_uuid;
    this.answer = answer;
    this.order = order;
  }
}

export interface Answers {
  task_assignment_uuid: string;
  responses: Array<QuestionAndResponse>;
}

export interface WorkFlowFile {
  id: number;
  uuid: string;
  file_name: string;
  file: string;
  file_type: string;
  createdAt: string;
  receivedAt: string;
  updatedAt: string;
  deletedAt: string;
  status: string;
  workflow_id: number;
  file_duration: number;
  district: string;
  state: string;
  vendor: string;
  metadata?: object | null;
}

export interface Assignee {
  id: number;
  uuid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  district: string;
  state: string;
  address: string;
  pincode: string;
  payment_details: string;
}

export enum TaskStatus {
  ASSIGNED = "ASSIGNED",
  COMPLETED = "COMPLETED",
}

export interface TaskAssignment {
  id: number;
  uuid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  task_id: number;
  assignee_id: number;
  workflow_file_id: number;
  review_rating: string | null;
  review_comments: string | null;
  reviewer_id: string | null;
  task_assignment_createdAt: string;
  workflow_file: WorkFlowFile;
  assignee: Assignee;
  workflowFileStatus: TaskStatus;
  workflow_type: number;
  answers: Array<QuestionAndResponse>;
}

export async function insertTasks(
  taskAssignments: Array<TaskAssignment>,
  workFlowNumber: number
): Promise<void> {
  let db = await getDb().collection(tasksCollection);
  logger.info(`\nRECIEVED TASK ASSIGNEMENTS LENGTH == ${taskAssignments.length}`)
  logger.info(`\nRECIEVED TASK ASSIGNEMENTS OBJECT\n\t${JSON.stringify(taskAssignments)}`)
  for(let taskAssignment of taskAssignments) {
    taskAssignment["workflowFileStatus"] = TaskStatus.ASSIGNED;
    taskAssignment["workflow_type"] = workFlowNumber;
    taskAssignment.assignee.phone = taskAssignment.assignee.phone.replace(
      "+",
      ""
    );
    taskAssignment.assignee.phone = taskAssignment.assignee.phone.replace(
      " ",
      ""
    );
    taskAssignment.assignee.phone = taskAssignment.assignee.phone.replace(
      "_",
      ""
    );
    let questions;
    let answers: Array<QuestionAndResponse>; 
    if(workFlowNumber == 1){
        questions = await ThreeQuestion.getThreeQuestionByLang('en');
    }else if(workFlowNumber == 2){
        questions = await FiveQuestion.getFiveQuestionByLang('en');
    }  
    if(questions == null){
        logger.info("\nNO QUESTIONS IN THE DB\n");
    }
    answers = questions.map((question: any) => {
        return {
            question_uuid: question.question_uuid,
            order: question.order,
            answer: null
        }
    });
    taskAssignment.answers = answers;
  }
  logger.info(`\nCONSTRUCTED TASK ASSIGNEMENTS LENGTH == ${taskAssignments.length}`)
  logger.info(`\nCONSTRUCTED TASK ASSIGNEMENTS OBJECT\n\t${JSON.stringify(taskAssignments)}`)
  try{
  await db.insertMany(taskAssignments);

  }catch(error){
    logger.error(`DB UPDATE ERROR insertMany(taskAssignments)\n\t${JSON.stringify(error)}`)
  }
}

export async function changeTaskAssignmentStatusByTaskId(
  taskId: string
): Promise<void> {
  try {
    let result = await getDb()
      .collection(tasksCollection)
      .updateOne(
        {
          _id: new ObjectId(taskId),
        },
        {
          $set: {
            workflowFileStatus: TaskStatus.COMPLETED,
          },
        }
      );

  } catch (error) {
    logger.error(`\nDB UPDATE ERROR FROM changeTaskAssignmentStatusByTaskId\n\t${JSON.stringify(error)}`);
  }
}

export async function getAnswersByTaskAndTaskAssignmentId(
  taskId: string,
  taskAssignmentUuid: string
): Promise<Answers | null> {
  let result = await getDb()
    .collection(tasksCollection)
    .findOne(
      {
        _id: new ObjectId(taskId),
      },
      {
        projection: {
          answers: 1,
          _id: 0,
        },
      }
    );

  let answers: Answers;
  if (result == null) {
    return null;
  }
  let newAnswers = result.answers.map((answer: QuestionAndResponse) => {
    return {
        question_uuid: answer.question_uuid,
        answer: answer.answer
    }
  })
  answers = {
    task_assignment_uuid: taskAssignmentUuid,
    responses: newAnswers,
  };
  return answers;
}
