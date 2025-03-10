import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Keep your key in .env

export const convertTextToStructuredJSON = async (text, imageUrl) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // console.log("text: ", text);

    const prompt = `
    You are a medical report formatter.
    Convert the extracted medical report text into a structured JSON array in this exact format:
    
    [
      {
        "title": "Report Title",               // e.g., "MRI : Brain", "Thyroid Profile"
        "type": "Labs | Imaging | Diagnosis",  // Choose one or define appropriately
        "doctor": "Doctor's Name",
        "date": "YYYY-MM-DD",
        "image": "${imageUrl}",                // Use this image link as report image
        "hospital": "Hospital Name or Details",
        "summary": "Patient shows normal cardiovascular and respiratory functions. No signs of infection or abnormality found.",
        "additionalDetails": {
        // Only include clinical/medical details — symptoms, observations, vitals, test results.
        // Do NOT include patient name, gender, DOB, age, contact details, etc.
   
          "Key1": "Value1",
          "Key2": "Value2",
          "Key3": "Value3"
        }
      }
    ]

 
    ⚠️ Rules:
- Keep only medically relevant information in "additionalDetails". No personal info.
- Add a concise "summary" field with a short readable summary of the diagnosis or condition.
- If any field is not found in the text, leave it as an empty string.
- Always return the JSON array (even if there's only one item).
    
    🟢 Be consistent with property naming. Only return valid JSON.
    🟢 Avoid markdown or text outside the array.
    🟢 Use actual values from the extracted text for each field.
    🟢 If some values like 'hospital' or 'date' are missing, set them as empty strings.
    🟢 Keep everything inside a JSON array, even if there is only one report.
    Text to format:
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
        // console.log("Cleaned JSON text:", structuredJsonText.substring(0, 100) + "...");

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
