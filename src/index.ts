import { Probot } from "probot";
import issue_manager from "./issue_manager.js";
import {GoogleGenerativeAI} from "@google/generative-ai";
import pr_manager from "./pr_manager.js";

let genAI: GoogleGenerativeAI | undefined;

export default (app: Probot) => {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } else {
    console.error("GEMINI_API_KEY environment variable is not set.");
    return;
  }
issue_manager(app,genAI);
  pr_manager(app,genAI);
};
