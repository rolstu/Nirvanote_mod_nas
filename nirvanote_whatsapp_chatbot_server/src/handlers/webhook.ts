import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import {
  MessageType,
  ReceivedMessage,
  RecipientType,
  WhatsAppService,
} from "../utils/whatsapp";
import { WorkflowState } from "../utils/cache";
import { Account } from "../models/Account";
import { getDb } from "../utils/db";
import { QuestionAnswer } from "../types/language";
import { getLanguage } from "../utils/language";
import {
  changeTaskAssignmentStatusByTaskId,
  tasksCollection,
  TaskStatus,
} from "../models/Task";
import { sendAnswers } from "../utils/integration";
import { ObjectId } from "mongodb";

const language: string = "en";

export async function handleWebhookRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let message = req.body as ReceivedMessage;
    handleMessage(message);
    res.status(200).json({
      workflowFileStatus: "ok",
    });
  } catch (err) {
    next(err);
  }
}

async function handleMessage(message: ReceivedMessage): Promise<void> {
  try {
    // Initialize Variables
    if (message.statuses != undefined){
      return
    }
    let state = await WorkflowState.fetchFromCache(message.contacts[0].wa_id);
    let isStatePersistBlocked = false;

    let service = await WhatsAppService.instance();
    if (!state?.language) {
      let account = await Account.fetchUser({
        wa_id: message.contacts[0].wa_id,
      });

      state = await WorkflowState.startWorkflow(
        message.contacts[0].wa_id,
        null,
        "en",
        account ? account.isSecurityAccepted : false,
        null,
        null,
        null
      );
    }

    switch (state?.currentState) {
      case null:
        if (!state?.acceptedSecurity && state?.contextId === null) {
          await msgSender(state!, service, message, "SECURITY_POLICY_MESSAGE");
          break;
        } else {
          await handleConversation(state, service, message);
          break;
        }
      default:
        await handleConversation(state, service, message);
        break;
    }
    if (!isStatePersistBlocked) {
      if (state) await state.persist();
    }
  } catch (error) {
    logger.error(`HANDLE MESSAGE ERROR\n\t${error}`);
  }
}

async function handleConversation(
  state: WorkflowState | null,
  service: WhatsAppService,
  message: ReceivedMessage
) {
  if (message.messages[0].button) {
    let buttonPressed = message.messages[0].button.text.toLowerCase();
    let switchButton = buttonPressed.split(".");
    let checkedResponses: {
      answers: Array<QuestionAnswer>;
      position: Number;
    } | null = await checkButtonResponse(
      state!,
      switchButton[switchButton.length - 1]
    );
    if (
      !!checkedResponses &&
      state?.contextId === message.messages[0].context.id
    ) {
      switch (state.currentState) {
        case "SECURITY_POLICY_MESSAGE":
          if (checkedResponses.position === 0) {
            state.acceptedSecurity = true;
            await Account.updateUser({
              wa_id: message.contacts[0].wa_id,
              isSecurityAccepted: true,
            });
            await msgSender(state, service, message, "WELCOME_MESSAGE");
          } else {
            await msgSender(state, service, message, "THANK_YOU_MESSAGE");
            await state.clear();
          }
          break;
        case "WELCOME_MESSAGE":
          if (checkedResponses.position === 0) {
            await msgSender(
              state,
              service,
              message,
              "CHOOSE_WORKFLOW_DOG_MESSAGE"
            );
          }
          break;
        case "CHOOSE_WORKFLOW_DOG_MESSAGE":
          if (checkedResponses.position === 0) {
            await msgSender(
              state,
              service,
              message,
              "CHOOSE_WORKFLOW_AOT_MESSAGE"
            );
          } else {
            await msgSender(
              state,
              service,
              message,
              "CHOOSE_WORKFLOW_POS_MESSAGE"
            );
          }
          break;
        case "CHOOSE_WORKFLOW_AOT_MESSAGE":
          if (checkedResponses.position === 0) {
            state.currentFlow = "5Q";
            let task = await getDb().collection(tasksCollection).findOne({
              "assignee.phone": message.contacts[0].wa_id,
              workflowFileStatus: TaskStatus.ASSIGNED,
              workflow_type: 2,
            });
            if (task == null) {
              await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
              await state.clear();
            } else {
              state.objectid = task._id.toHexString();
              state.task_assignment_uuid = task.uuid;
              state.language = language;
              let fileUrl = task.workflow_file.file;
            
              await linkSender(state, service, message, fileUrl);
              await msgSender(state, service, message, "DA_QUESTION1_MESSAGE");
            }
          } else {
            state.currentFlow = "F4";
            await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
            await state.clear();
          }
          break;
        case "CHOOSE_WORKFLOW_POS_MESSAGE":
          if (checkedResponses.position === 0) {
            state.currentFlow = "F3";
            await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
            await state.clear();
          } else {
            state.currentFlow = "3Q";
            let task = await getDb().collection(tasksCollection).findOne({
              "assignee.phone": message.contacts[0].wa_id,
              workflowFileStatus: TaskStatus.ASSIGNED,
              workflow_type: 1,
            });
            if (task == null) {
              await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
              await state.clear();
            } else {
              state.objectid = task._id.toHexString();
              state.task_assignment_uuid = task.uuid;
              state.language = language;
              let fileUrl = task.workflow_file.file;
              
              await linkSender(state, service, message, fileUrl);
              await msgSender(state, service, message, "GA_QUESTION1_MESSAGE");
            }
          }
          break;
        case "DA_QUESTION1_MESSAGE":
          await updateTaskAnswer(
            state,
            "1",
            "5Q",
            switchButton[switchButton.length - 1]
          );
          if (checkedResponses.position === 0) {
            let convoLanguage = await getLanguage(state.language);
            let current_task_id = state.objectid;
            let task = await getDb()
              .collection(tasksCollection)
              .findOne({
                "assignee.phone": message.contacts[0].wa_id,
                workflowFileStatus: TaskStatus.ASSIGNED,
                workflow_type: 2,
                _id: new ObjectId(current_task_id!),
              });
            if (task != null) {
              let components = JSON.stringify(
                convoLanguage!.language_messages["DA_QUESTION2_MESSAGE"]
                  .components
              );
              let componentsArray = JSON.parse(
                components.replace(
                  "{{{LOCATION}}}",
                  task.workflow_file.district
                )
              );
              await msgSender(
                state,
                service,
                message,
                "DA_QUESTION2_MESSAGE",
                componentsArray
              );
            } else {
              await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
              await state.clear();
            }
          } else {
            let rejectedQuestions = ["2", "3", "4", "5"];
            for (let i = 0; i < rejectedQuestions.length; i++) {
              await updateTaskAnswer(state, rejectedQuestions[i], "5Q", "N/A");
            }
            await msgSender(state, service, message, "COMMENT_MESSAGE");
          }
          break;
        case "DA_QUESTION2_MESSAGE":
          await updateTaskAnswer(
            state,
            "2",
            "5Q",
            switchButton[switchButton.length - 1]
          );
          await msgSender(state, service, message, "DA_QUESTION3_MESSAGE");
          break;
        case "DA_QUESTION3_MESSAGE":
          await updateTaskAnswer(
            state,
            "3",
            "5Q",
            switchButton[switchButton.length - 1]
          );
          await msgSender(state, service, message, "DA_QUESTION4_MESSAGE");
          break;
        case "DA_QUESTION4_MESSAGE":
          await updateTaskAnswer(
            state,
            "4",
            "5Q",
            switchButton[switchButton.length - 1]
          );
          await msgSender(state, service, message, "DA_QUESTION5_MESSAGE");
          break;
        case "DA_QUESTION5_MESSAGE":
          await updateTaskAnswer(
            state,
            "5",
            "5Q",
            switchButton[switchButton.length - 1]
          );
          await msgSender(state, service, message, "COMMENT_MESSAGE");
          break;

        case "GA_QUESTION1_MESSAGE":
          await updateTaskAnswer(
            state,
            "1",
            "3Q",
            switchButton[switchButton.length - 1]
          );
          if (checkedResponses.position === 0) {
            await msgSender(state, service, message, "GA_QUESTION2_MESSAGE");
          } else {
            let rejectedQuestions = ["2", "3"];
            for (let i = 0; i < rejectedQuestions.length; i++) {
              await updateTaskAnswer(state, rejectedQuestions[i], "3Q", "N/A");
            }
            await msgSender(state, service, message, "COMMENT_MESSAGE");
          }
          break;
        case "GA_QUESTION2_MESSAGE":
          await updateTaskAnswer(
            state,
            "2",
            "3Q",
            switchButton[switchButton.length - 1]
          );
          await msgSender(state, service, message, "GA_QUESTION3_MESSAGE");
          break;
        case "GA_QUESTION3_MESSAGE":
          await updateTaskAnswer(
            state,
            "3",
            "3Q",
            switchButton[switchButton.length - 1]
          );
          await msgSender(state, service, message, "COMMENT_MESSAGE");
          break;
        default:
          await msgSender(state, service, message, "INVALID_OPTION_MESSAGE");
          break;
      }
    }
  } else if (message.messages[0].type == "text") {
    switch (message.messages[0].text?.body.toLowerCase()) {
      case "hi":
        await msgSender(
          state!,
          service,
          message,
          "CHOOSE_WORKFLOW_DOG_MESSAGE"
        );
        break;
      case "/clear":
        if (state && process.env.DEBUG_MODE === "true") {
          state.clear();
          await state.persist();
          await textSender(
            state,
            service,
            message,
            "Debug Mode: Cleared State"
          );
        } else {
          await msgSender(state!, service, message, "INVALID_OPTION_MESSAGE");
        }
        break;
      case "reset":
        if (state && process.env.DEBUG_MODE === "true") {
          state.clear();
          await state.persist();
          await textSender(
            state,
            service,
            message,
            "Debug Mode: Cleared State"
          );
        } else {
          await msgSender(state!, service, message, "INVALID_OPTION_MESSAGE");
        }
        break;
      default:
        if (state && state?.currentState == "COMMENT_MESSAGE") {
          if (state.currentFlow == "3Q") {
            await updateTaskAnswer(
              state,
              "4",
              state.currentFlow,
              message.messages[0].text?.body!
            );


            if (state.task_assignment_uuid && state.objectid) {
              await changeTaskAssignmentStatusByTaskId(state.objectid);
              await sendAnswers(state.objectid, state.task_assignment_uuid, 1);
            }
            let task = await getDb().collection(tasksCollection).findOne({
              "assignee.phone": message.contacts[0].wa_id,
              workflowFileStatus: TaskStatus.ASSIGNED,
              workflow_type: 1,
            });

            if (task == null) {
              await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
              await state.clear();
            } else {
              state.objectid = task._id.toHexString();
              state.task_assignment_uuid = task.uuid;
              state.language = language;
              let fileUrl = task.workflow_file.file;
              await linkSender(state, service, message, fileUrl);
              await msgSender(state, service, message, "GA_QUESTION1_MESSAGE");
            }
          } else if (state.currentFlow == "5Q") {
            await updateTaskAnswer(
              state,
              "6",
              state.currentFlow,
              message.messages[0].text?.body!
            );



            if (state.task_assignment_uuid && state.objectid) {
              await changeTaskAssignmentStatusByTaskId(state.objectid);
              await sendAnswers(state.objectid, state.task_assignment_uuid, 2);
            }

            let task = await getDb().collection(tasksCollection).findOne({
              "assignee.phone": message.contacts[0].wa_id,
              workflowFileStatus: TaskStatus.ASSIGNED,
              workflow_type: 2,
            });

            if (task == null) {
              await msgSender(state, service, message, "NO_TASKS_AVAILABLE");
              await state.clear();
            } else {
              state.objectid = task._id.toHexString();
              state.task_assignment_uuid = task.uuid;
              state.language = language;
              let fileUrl = task.workflow_file.file;
              await linkSender(state, service, message, fileUrl);
              await msgSender(state, service, message, "DA_QUESTION1_MESSAGE");
            }
          }
        } else {
          await msgSender(state!, service, message, "INVALID_OPTION_MESSAGE");
        }
        break;
    }
  }
}

async function checkButtonResponse(
  state: WorkflowState,
  button: string
): Promise<{ answers: Array<QuestionAnswer>; position: Number } | null> {
  if (state.answers) {
    let parsedAnswers = JSON.parse(state.answers);
    for (let i = 0; i < parsedAnswers.length; i++) {
      if (button === parsedAnswers[i].answer.toLowerCase()) {
        return { answers: parsedAnswers, position: i };
      }
    }
  }
  return null;
}

async function updateTaskAnswer(
  state: WorkflowState,
  question: string,
  flow: "3Q" | "5Q",
  answer: string
): Promise<void> {
  if (flow == "3Q") {
    try {
      const result = await getDb()
        .collection(tasksCollection)
        .updateOne(
          {
            $and: [
              { _id: new ObjectId(state.objectid!) },
              { workflowFileStatus: TaskStatus.ASSIGNED },
            ],
          },
          {
            $set: {
               "answers.$[element].answer": answer
            },
          },
          {
            arrayFilters:[{
                "element.order": Number(question)
            }]
          }
        );
    } catch (error) {
      logger.error(`UPDATE ANSWER ERROR\n\t${error}`);
    }
  } else if (flow == "5Q") {
    try {
     
      const result = await getDb()
        .collection(tasksCollection)
        .updateOne(
          {
            $and: [
              { _id: new ObjectId(state.objectid!) },
              { workflowFileStatus: TaskStatus.ASSIGNED },
            ],
          },
          {
            $set: {
               "answers.$[element].answer": answer
            },
          },
          {
            arrayFilters:[{
                "element.order": Number(question)
            }]
          }
        );
    } catch (error) {
      logger.error(`UPDATE ANSWER ERROR\n\t${error}`);
    }
  }
}

async function msgSender(
  state: WorkflowState,
  service: WhatsAppService,
  message: ReceivedMessage,
  template: string,
  components: Array<any> | null = null
) {
  let convoLanguage = await getLanguage(state.language);

  if (convoLanguage) {
    let resp = await service.sendMessage({
      recipient_type: RecipientType.Individual,
      to: message.contacts[0].wa_id,
      type: MessageType.Template,
      template: convoLanguage!.getMessageTemplate(
        template,
        components ? components : []
      ),
    });
    if (template !== "INVALID_OPTION_MESSAGE") {
      state.contextId = resp.messages[0].id;
      state.answers = JSON.stringify(
        convoLanguage.language_messages[template].answers
      );
      state.currentState = template;
    }
    return;
  } else {
    logger.error(`Language ${state.language} not found`);
    return;
  }
}

async function linkSender(
  state: WorkflowState,
  service: WhatsAppService,
  message: ReceivedMessage,
  link: string
) {
  let resp = await service.sendMessage({
    recipient_type: RecipientType.Individual,
    to: message.contacts[0].wa_id,
    type: MessageType.Text,
    text: {
      body: link,
    },
    // preview_url: true
  });
  return;
}

// ================ Not useful as of now. ================
async function textSender(
  state: WorkflowState,
  service: WhatsAppService,
  message: ReceivedMessage,
  text: string
) {
  let resp = await service.sendMessage({
    recipient_type: RecipientType.Individual,
    to: message.contacts[0].wa_id,
    type: MessageType.Text,
    text: {
      body: text,
    },
  });
  return;
}
