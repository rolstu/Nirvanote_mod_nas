import Redis from "ioredis";
import logger from "./logger";

let redis: Redis | null = null;

export class WorkflowState {
    id: string;
    contextId: string | null;
    language: string | null;
    acceptedSecurity: boolean;

    currentState: string | null;
    currentFlow: string | null;
    answers: string | null;
    task_assignment_uuid?: string | null;
    objectid?: string | null;

    constructor(
        id: string,
        contextId: string | null = null,
        language: string | null = null,
       
        acceptedSecurity = false,
        currentState: string | null = null,
        currentFlow: string | null = null,
        answers: string | null = null,
        task_assignment_uuid: string | null = null,
        objectid: string | null = null
    ) {
        this.id = id;
        this.contextId = contextId;
        this.language = language;
        this.acceptedSecurity = acceptedSecurity;
        this.currentState = currentState;
        this.currentFlow = currentFlow;
        this.answers = answers;
      
        this.task_assignment_uuid = task_assignment_uuid;
        this.objectid = objectid;
    }

    static async startWorkflow(
        id: string,
        contextId: string | null,
        language: string,
      
        acceptedSecurity: boolean,
        currentState: string | null,
        currentFlow: string | null,
        answers: string | null,
    ): Promise<WorkflowState | null> {
        let workflowState = new WorkflowState(
            id,
            contextId,
            language,
        
            acceptedSecurity,
            currentState,
            currentFlow,
            answers
        );
        if (!redis) {
            throw new Error("Redis not initialized");
        }
        logger.info(`id of WorkflowState ==${id}`)
        await redis.hmset(`whatsapp:${id}`, workflowState, (err, result) => {
            logger.error(`CACHE ERROR\n\t${err}`);
        });
        await redis.expire(`whatsapp:${id}`, 60 * 15);
        if(workflowState) return workflowState;
        else return null;
    }

    static async fetchFromCache(id: string): Promise<WorkflowState | null> {
        if (!redis) {
            throw new Error("Redis not initialized");
        }
        let result = await redis.hgetall(`whatsapp:${id}`);
        
        if (result) {
            return new WorkflowState(
                result.id,
                result.contextId,
                result.language,
               
                result.acceptedSecurity === "true",
                result.currentState,
                result.currentFlow,
                result.answers,
                result.task_assignment_uuid,
                result.objectid
            );
        } else {
            return null;
        }
    }

    async persist(): Promise<void> {
        if (!redis) {
            throw new Error("Redis not initialized");
        }
        await redis.hmset(`whatsapp:${this.id}`, this, (err) => {
            if (err) {
                throw err;
            }
        });
        await redis.expire(`whatsapp:${this.id}`, 60 * 15);
    }

    async clear(): Promise<void> {
        if (!redis) {
            throw new Error("Redis not initialized");
        }
        await redis.del(`whatsapp:${this.id}`);
    }
}

export async function pingRedis() {
    try {
        let tempRedis = new Redis({
            port: parseInt(process.env.REDIS_PORT || "6379"),
            host: process.env.REDIS_HOST,
        });
        await new Promise((resolve, reject) => {
            tempRedis
                .ping()
                .then(() => {
                    logger.info("Redis is online!");
                    redis = tempRedis;
                    resolve(true);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    } catch (error) {
        throw error;
    }
}

export async function fetchFromCache(key: string): Promise<string | null> {
    if (!redis) {
        throw new Error("Redis not initialized");
    }
    let result = await redis.get(key);
    return result;
}

export async function setCache(key: string, value: string, ttl?: number) {
    if (!redis) {
        throw new Error("Redis not initialized");
    }
    await redis.set(key, value);
    if (ttl) {
        await redis.expire(key, ttl);
    }
}

export function calculateExpireTime(expiresOn: Date) {
    let now = new Date();
    let diff = expiresOn.getTime() - now.getTime();
    return Math.floor(diff / 1000);
}
