import * as XLSX from "xlsx/xlsx.mjs";
import { Question } from "@/types/quiz";
import { QUIZ_QUESTION_TYPE } from "@/constants";

interface ParsedQuestionRow {
    [key: string]: string;
};

const getCorrectAnswerFromColumns = (correctLetter: string, row: ParsedQuestionRow): string | string[] => {
    if (!correctLetter) return "";

    const letters = correctLetter.split(",").map(l => l.trim().toUpperCase());
    const mapped = letters.map(l => {
        const colName = `OPTION ${l}`;
        return row[colName] ?? "";
    }).filter(Boolean);

    return mapped.length === 1 ? mapped[0] : mapped;
};

export const parseQuizQuestionsFromExcel = async (data: ArrayBuffer): Promise<Question[]> => {
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: ParsedQuestionRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const headers = Object.keys(rows[0]).map(h => h.toUpperCase());
    for (const col of ["QUESTION NO", "TYPE", "DESCRIPTION", "CORRECT ANSWER", "MARKS"]) {
        if (!headers.includes(col)) {
            throw new Error(`Missing required column: ${col}`);
        }
    }

    const questions: Question[] = [];
    let expectedQuestionNo = 1;

    for (const row of rows) {
        const rowUpper: ParsedQuestionRow = {};
        for (const key in row) {
            rowUpper[key.toUpperCase()] = String(row[key]).trim();
        }

        const questionNo = parseInt(rowUpper["QUESTION NO"]);
        if (questionNo !== expectedQuestionNo) {
            throw new Error(`Question numbers must be in order. Expected ${expectedQuestionNo} but found ${questionNo}`);
        }

        const typeStr = rowUpper["TYPE"].toUpperCase();
        const type = typeStr === QUIZ_QUESTION_TYPE.MCQ ? QUIZ_QUESTION_TYPE.MCQ : typeStr === QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER ? QUIZ_QUESTION_TYPE.MULTIPLE_ANSWER : null;
        if (!type) throw new Error(`Invalid question type at question ${questionNo}`);

        const description = rowUpper["DESCRIPTION"];
        if (!description) throw new Error(`Missing description at question ${questionNo}`);

        const options: string[] = [];
        for (let col of ["OPTION A", "OPTION B", "OPTION C", "OPTION D", "OPTION E", "OPTION F"]) {
            if (rowUpper[col]) options.push(rowUpper[col]);
        }
        if (options.length < 2) throw new Error(`Question ${questionNo} must have at least 2 options`);

        let correctAnswerRaw = rowUpper["CORRECT ANSWER"];
        if (!correctAnswerRaw) throw new Error(`Missing correct answer at question ${questionNo}`);

        let correctAnswer: string | string[];

        correctAnswer = getCorrectAnswerFromColumns(correctAnswerRaw, rowUpper);

        const marks = parseFloat(rowUpper["MARKS"]);
        if (isNaN(marks)) throw new Error(`Invalid marks at question ${questionNo}`);

        questions.push({
            questionNo,
            description,
            type,
            options,
            correctAnswer,
            marks
        });

        expectedQuestionNo++;
    }

    return questions;
};
