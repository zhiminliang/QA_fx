import { GoogleGenAI } from "@google/genai";
import { LogEntry } from "../types";

// Helper to get safe API key
const getApiKey = () => {
    // In a real environment, this should be securely managed.
    // Assuming process.env.API_KEY is available as per instructions.
    return process.env.API_KEY || '';
};

export const analyzeLogEntry = async (entry: LogEntry, context: LogEntry[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        return "请配置 API Key 以使用智能分析功能。";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        // Provide some context (previous 3 logs) to help with diagnosis
        const contextStr = context.map(c => `[${c.timestamp}] ${c.level}: ${c.message}`).join('\n');
        
        const prompt = `
        你是一名资深软件测试和开发工程师。请分析以下日志条目。
        
        上下文日志 (Context):
        ${contextStr}

        目标分析日志 (Target):
        [${entry.timestamp}] ${entry.level} (${entry.source}): ${entry.message}

        请提供：
        1. 错误可能的原因 (Possible Cause)。
        2. 针对开发者的修复建议 (Fix Recommendation)。
        3. 对测试人员的验证建议 (Test Advice)。
        请使用中文回答，简洁明了。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Using generic Flash model for speed/efficiency in logs
            contents: prompt,
        });

        return response.text || "无法生成分析结果。";

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return "分析服务暂时不可用，请检查网络或 API Key 设置。";
    }
};

export const generateSummary = async (logs: LogEntry[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "请配置 API Key。";
    
    // Only analyze the first chunk of error logs to avoid token limits in this demo
    const errorLogs = logs.filter(l => l.level === 'ERROR').slice(0, 20);
    
    if (errorLogs.length === 0) return "日志中未发现明显错误，无需生成错误汇总。";

    try {
         const ai = new GoogleGenAI({ apiKey });
         const logData = errorLogs.map(l => `${l.source} | ${l.message}`).join('\n');
         
         const prompt = `
         请阅读以下软件错误日志片段，并生成一份简报：
         1. 发现的主要问题类型。
         2. 涉及的主要模块或来源。
         3. 严重程度评估。
         
         日志数据:
         ${logData}
         `;

         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
         });

         return response.text || "无法生成汇总。";

    } catch (error) {
        return "汇总生成失败。";
    }
};
