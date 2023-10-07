import axios, { AxiosError } from "axios";
import { calculateExpireTime, fetchFromCache, setCache } from "./cache";
import { MessageSendError } from "./errors";
import { readFileSync } from "fs";
import logger from "./logger";

export enum RecipientType {
    Individual = "individual",
}

export enum MessageType {
    Template = "template",
    Text = "text",
    Video = "video",
}

interface TypeV {
    id: string;
}

export interface Template {
    name: string;
    language: {
        policy: string;
        code: string;
    };
    components?: Array<{
        type: string;
        parameters: Array<{
            type: string;
            text: string;
        }>;
    }>;
}

export interface Message {
    recipient_type: RecipientType;
    to: string;
    type: MessageType;
    template?: Template;
    text?: {
        body: string;
    };
    video?: {
        id: string;
    };
    preview_url?: boolean
}

export interface ReceivedMessage {
    contacts: [
        {
            profile: {
                name: string;
            };
            wa_id: string;
        }
    ];
    statuses?: object;
    messages: [
        {
            button: {
                text: string;
            };
            context: {
                from: string;
                id: string;
            };
            from: string;
            id: string;
            timestamp: string;
            type: string;
            text?: {
                body: string;
            };
        }
    ];
}

export const whatsappTokenKey = "whatsappToken";

export class WhatsAppService {
    #token: string;

    constructor(token: string) {
        this.#token = token;
    }

    static async instance(): Promise<WhatsAppService> {
        let token = await fetchFromCache(whatsappTokenKey);
        if (!token) {
            let response = await axios.post(
                `${process.env.WHATSAPP_HOST}/v1/users/login`,
                null,
                {
                    headers: {
                        Authorization: `Basic ${Buffer.from(
                            `${process.env.WHATSAPP_USERNAME}:${process.env.WHATSAPP_PASSWORD}`
                        ).toString("base64")}`,
                    },
                }
            );
            if (response.status === 200) {
                await setCache(
                    whatsappTokenKey,
                    response.data.users[0].token,
                    calculateExpireTime(new Date(response.data.users[0].expires_after)) -
                    12 * 60 * 60
                );
                return new WhatsAppService(response.data.users[0].token);
            } else {
                throw new Error("Could not authenticate with WhatsApp");
            }
        } else {
            return new WhatsAppService(token);
        }
    }

    async sendMessage(message: Message): Promise<any> {
        try {
            let response = await axios.post(
                `${process.env.WHATSAPP_HOST}/v1/messages`,
                message,
                {
                    headers: {
                        Authorization: `Bearer ${this.#token}`,
                    },
                }
            );
            
            if (response.status !== 201) {
                throw new MessageSendError("Could not send message");
            }
            return response.data;
        } catch (error) {
            if (error instanceof AxiosError) {
                logger.error(`WHATSAPP SENDMESSAGE ERROR\n\t${JSON.stringify(error)}`);
                throw new MessageSendError("Could not send message", error);
            }
        }
    }

    async uploadMedia(path: string): Promise<string> {
        try {
            let file = readFileSync(path);
            let response = await axios.post(
                `${process.env.WHATSAPP_HOST}/v1/media`,
                file,
                {
                    headers: {
                        Authorization: `Bearer ${this.#token}`,
                        "Content-Type": "video/mp4",
                    },
                }
            );
            if (response.status === 201) {
                
                let tempV: Array<TypeV> = Array.from(response.data.media);
                let tempId = tempV[0].id;

               
                return tempId;
            } else {
                throw new Error("Could not upload media");
            }
        } catch (error) {
            if (error instanceof AxiosError) {
                logger.error(`uploadMedia ERROR\n\t${error.response?.data}`);
                throw new MessageSendError("Could not upload media", error);
            } else {
                throw error;
            }
        }
    }
}
