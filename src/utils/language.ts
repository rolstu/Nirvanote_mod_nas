import fs from "fs";
import path from "path";

import { Language } from "../types/language";

export async function getLanguages(): Promise<Array<string>> {
    let languages: Array<string> = [];
    let files = fs.readdirSync(path.join(__dirname, "..", "languages"));
    files.forEach((file) => {
        if (file.endsWith(".json")) { // to prevent Readme.md from being included
            const lang = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "languages", file), "utf8"));
            if (lang.version === parseInt(process.env.LANGUAGE_VERSION!)) languages.push(file.replace(".json", ""));
        }
    });
    return languages;
}

export async function getLanguage(languageCode: string | null): Promise<Language | null> {
    if (languageCode !== null) {
        if (fs.existsSync(path.join(__dirname, "..", "languages", languageCode + ".json"))) {
            let language = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "languages", languageCode + ".json"), "utf8"));
            if (language.version === parseInt(process.env.LANGUAGE_VERSION!)) return new Language(language.whatsapp_language_code, language.version, language.language_policy, language.language_name, language.language_messages);
            return null;
        } else {
            return null;
        }
    } else {
        return null;
    }
}