import SummaryModel from "../model/summary.model.js";
import TodoModel from "../model/todo.model.js";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

// Debug log for API key
console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
console.log("GROQ_API_KEY length:", process.env.GROQ_API_KEY?.length);

// Initialize Groq client with API key from environment variable
const groq = new Groq({
    apiKey: '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'
});

export const generateSummary = async (req, res) => {
    try {
        console.log("Starting summary generation...");
        
        const userId = req.user;
        if (!userId) {
            console.error("No user ID found in request");
            return res.status(401).json({
                message: "User not authenticated"
            });
        }
        console.log("User ID:", userId);

        // Get current date in IST (UTC+5:30)
        const now = new Date();
        const today = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log("Searching for completed tasks between:", today.toLocaleString(), "and", tomorrow.toLocaleString());

        // First, let's check all completed tasks for this user
        const allCompletedTasks = await TodoModel.find({
            user: userId,
            isComplete: true
        });
        console.log("Total completed tasks for user:", allCompletedTasks.length);
        
        if (allCompletedTasks.length > 0) {
            console.log("Sample completed task:", {
                text: allCompletedTasks[0].text,
                isComplete: allCompletedTasks[0].isComplete,
                createdAt: allCompletedTasks[0].createdAt
            });
        }

        // Get completed tasks for today
        const completedTasks = await TodoModel.find({
            user: userId,
            isComplete: true,
            completedAt: {
                $gte: today,
                $lt: tomorrow
            }
        });

        console.log("Found completed tasks for today:", completedTasks.length);
        if (completedTasks.length > 0) {
            console.log("Sample task from today:", {
                text: completedTasks[0].text,
                isComplete: completedTasks[0].isComplete,
                createdAt: completedTasks[0].createdAt
            });
        }

        if (completedTasks.length === 0) {
            console.log("No tasks completed today");
            return res.status(200).json({
                message: "No tasks completed today",
                summary: "No tasks were completed today."
            });
        }

        // Format tasks for the prompt
        const taskList = completedTasks.map(task => `- ${task.text}`).join('\n');
        const prompt = `Summarize the following tasks I completed today in a natural, conversational way:\n${taskList}`;

        console.log("Generating summary with Groq...");
        console.log("Prompt:", prompt);

        try {
            // Set up streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            let fullSummary = '';

            // Generate summary using Groq with streaming
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that summarizes completed tasks in a natural, encouraging way."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "meta-llama/llama-4-scout-17b-16e-instruct",
                temperature: 1,
                max_completion_tokens: 1024,
                top_p: 1,
                stream: true,
                stop: null
            });

            // Stream the response
            for await (const chunk of chatCompletion) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullSummary += content;
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }

            // Save the complete summary to database
            const newSummary = new SummaryModel({
                summary: fullSummary,
                user: userId
            });
            await newSummary.save();
            console.log("Summary saved to database");

            // Send the end message
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();

        } catch (groqError) {
            console.error("Groq API error:", groqError);
            return res.status(500).json({
                message: "Error generating summary with Groq",
                error: groqError.message
            });
        }
    } catch (error) {
        console.error("Error generating summary:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            message: "Error generating summary",
            error: error.message
        });
    }
};

export const getSummaries = async (req, res) => {
    try {
        const userId = req.user;
        if (!userId) {
            return res.status(401).json({
                message: "User not authenticated"
            });
        }

        console.log("Fetching summaries for user:", userId);

        const summaries = await SummaryModel.find({ user: userId })
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .limit(30); // Get last 30 summaries

        console.log("Found summaries:", summaries.length);

        res.status(200).json({
            message: "Summaries fetched successfully",
            summaries
        });
    } catch (error) {
        console.error("Error fetching summaries:", error);
        res.status(500).json({
            message: "Error fetching summaries",
            error: error.message
        });
    }
}; 
 