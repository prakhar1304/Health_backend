import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Keep your key in .env

export const convertTextToStructuredJSON = async (text) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log("text: ", text);

    const prompt = `
You are a medical report formatter. 
Convert this extracted medical report text into structured JSON in this format:
{
  "hospital_name": "",
  "doctor_name": "",
  "date": "",
  "report_type": "",
  "tests": [
    {
      "name": "",
      "value": "",
      "unit": "",
      "range": "",
      "status": ""
    }
  ],
  "summary": ""
}

Text:
"""${text}"""
`;


    // const result = await model.generateContent(prompt);
    // const response = await result.response;
    // const structuredJsonText = response.text();


    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let structuredJsonText = response.text();

        // Try to extract JSON if surrounded by backticks or other text
        let jsonMatch = structuredJsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            structuredJsonText = jsonMatch[1];
        } else {
            // Try to find JSON between curly braces if no code block found
            jsonMatch = structuredJsonText.match(/{[\s\S]*}/);
            if (jsonMatch) {
                structuredJsonText = jsonMatch[0];
            }
        }

        // Clean any potential issues before parsing
        structuredJsonText = structuredJsonText.trim();

        // Log the cleaned text for debugging
        console.log("Cleaned JSON text:", structuredJsonText.substring(0, 100) + "...");

        // Parse JSON
        return JSON.parse(structuredJsonText);
    } catch (e) {
        console.error("Error in Gemini processing:", e);
        console.error("Failed text processing. Input length:", text.length);

        // If we have a response but parsing failed, log a portion of it
        if (arguments.callee.structuredJsonText) {
            console.error("Response excerpt:",
                arguments.callee.structuredJsonText.substring(0, 200));
        }

        throw new Error("Text parsing with Gemini failed: " + e.message);
    }

};
