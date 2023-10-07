import {Template} from '../utils/whatsapp';

export interface QuestionAnswer{
    text: string;
    nextState: string;
}

interface LanguageTemplate {
    whatsapp_template_id: string;
    msg: string;
    answers: Array<QuestionAnswer>;
    components?: Array<{
        type: string;
        parameters: Array<{
            type: string;
            text: string;
        }>;
    }>;
}


export class Language {
    whatsapp_language_code: string;
    version: number;
    language_policy: string;
    language_name: string;
    language_messages: {
        [key: string]: LanguageTemplate;
    };

    constructor(
        whatsapp_language_code: string,
        version: number,
        language_policy: string,
        language_name: string,
        language_messages: {
            [key: string]: LanguageTemplate;
        }
    ){
        this.whatsapp_language_code = whatsapp_language_code;
        this.version = version;
        this.language_policy = language_policy
        this.language_name = language_name;
        this.language_messages = language_messages;
    }

    getMessageTemplate(
        templateName: string, components: Array<{
        type: string;
        parameters: Array<{
            type: string;
            text: string;
        }> | [];
    }>): Template {
        let lt = this.language_messages[templateName];
        if (components.length > 0) lt.components = components;
        let nlt : Template = {
            name: this.language_messages[templateName].whatsapp_template_id,
            language: {
                policy: "deterministic",
                code: this.whatsapp_language_code,
            },
            components: lt.components
        };

        return nlt;
    }
}