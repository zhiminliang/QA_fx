
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, PerformanceMetric, InterfaceMetric } from "../types";

const getApiKey = () => process.env.API_KEY || '';

export const analyzeLogEntry = async (entry: LogEntry, context: LogEntry[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "请配置 API Key。";
    try {
        const ai = new GoogleGenAI({ apiKey });
        const contextStr = context.map(c => `[${c.timestamp}] ${c.level}: ${c.message}`).join('\n');
        const prompt = `分析日志原因及修复建议：\n上下文：${contextStr}\n目标：${entry.message}`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        return response.text || "无分析。";
    } catch (e) { return "分析失败。"; }
};

export const generateSummary = async (logs: LogEntry[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "请配置 API Key。";
    const errorLogs = logs.filter(l => l.level === 'ERROR').slice(0, 15);
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `分析以下错误日志汇总：\n${errorLogs.map(l => l.message).join('\n')}`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "无法汇总。";
  } catch (e) { return "汇总失败。"; }
};

/**
 * 专业接口性能分析
 */
export const analyzePerformance = async (metrics: PerformanceMetric[], interfaceMetrics: InterfaceMetric[], logs: LogEntry[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "请配置 API Key。";
    
    const slowApis = [...interfaceMetrics].sort((a, b) => b.duration - a.duration).slice(0, 8);
    const errorApis = interfaceMetrics.filter(m => !m.status.startsWith('2')).slice(0, 8);
    
    // 计算基本分布
    const durations = interfaceMetrics.map(m => m.duration);
    const avg = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : 0;
    const max = durations.length ? Math.max(...durations) : 0;

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        你是一位资深的“高级接口性能测试工程师”。请基于以下提供的【原始性能指标】和【接口监控样本】，撰写一份具有深度的《接口性能专项诊断报告》。

        ### 原始数据摘要 ###
        - 总样本数: ${interfaceMetrics.length}
        - 平均响应时间: ${avg}ms
        - 峰值响应时间: ${max}ms
        - 关键慢接口清单:
        ${slowApis.map(a => `- [${a.method}] ${a.url} (${a.duration}ms, Status: ${a.status})`).join('\n')}
        - 异常响应样本:
        ${errorApis.length > 0 ? errorApis.map(a => `- ${a.url} -> ${a.status}`).join('\n') : "未发现非2xx响应"}

        ### 分析要求 ###
        请按以下维度进行深度解析，内容要求专业、严谨且具有工程指导意义：

        1. **响应时间分布与稳定性评估**：
           - 结合平均值与峰值，分析是否存在“长尾效应”（P99抖动）。
           - 判断接口性能是否符合 2-5-8 原则（2s内优秀，5s内可接受）。

        2. **潜在风险识别 (Hidden Risks)**：
           - **雪崩风险**：是否有关键路径接口耗时过长，可能导致连接池耗尽？
           - **串行阻塞**：分析日志中是否存在明显的 Waterfall 模式（一个接口结束后立即触发另一个）。
           - **冷启动与资源预热**：识别首个请求是否存在明显的延迟骤增。
           - **数据库/下游压力**：从特定 URL 的慢请求推测是否存在慢 SQL 或第三方依赖超时。

        3. **状态码深度剖析**：
           - 对 4xx/5xx 错误进行归因（是业务鉴权失败、并发冲突还是服务器内部崩溃？）。

        4. **针对性工程优化方案**：
           - 针对识别出的具体慢接口，给出具体建议：如“异步化处理”、“分库分表”、“静态资源CDN”、“本地二级缓存策略”或“API聚合优化”。

        5. **测试结论**：
           - 给出一个明确的风险等级（低/中/高/严峻），并附带一段总结性陈述。

        请使用专业的软件测试术语，使用 Markdown 格式排版，确保报告易读且专业。
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // 使用更强的模型处理复杂逻辑
            contents: prompt,
        });

        return response.text || "性能分析引擎未能生成有效报告。";
    } catch (e) {
        console.error("Professional Perf Analysis failed:", e);
        return "专业性能分析服务调用失败，请检查 API 额度或日志格式。";
    }
};

/**
 * 通过截图提取接口性能数据
 */
export const analyzeScreenshotForPerformance = async (base64Image: string): Promise<{metrics: InterfaceMetric[], report: string}> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("请配置 API Key。");
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const extractionResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
                { text: "请提取这张截图中的所有网络请求。识别方法(Method)、URL路径、状态码(Status)和耗时(Time/Duration，统一转换为毫秒数值)。请严格按 JSON 格式返回。格式为数组：[{\"url\": string, \"method\": string, \"status\": string, \"duration\": number}]" }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            url: { type: Type.STRING },
                            method: { type: Type.STRING },
                            status: { type: Type.STRING },
                            duration: { type: Type.NUMBER }
                        },
                        required: ["url", "method", "status", "duration"]
                    }
                }
            }
        });

        const metrics = JSON.parse(extractionResponse.text) as InterfaceMetric[];
        const report = await analyzePerformance([], metrics, []);

        return {
            metrics: metrics.map((m, i) => ({ ...m, id: `img-extract-${Date.now()}-${i}`, timestamp: new Date().toLocaleTimeString() })),
            report
        };
    } catch (e) {
        throw e;
    }
};
