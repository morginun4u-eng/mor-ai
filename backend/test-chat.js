
const SERVER = "https://mor-ai.onrender.com";

async function testChat() {
  const token = process.env.MOR_AI_APP_TOKEN;

  if (!token) {
    console.error("Missing MOR_AI_APP_TOKEN");
    process.exitCode = 1;
    return;
  }

  try {
    const response = await fetch(SERVER + "/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        message: "שלום MOR AI, הציגי את עצמך בעברית."
      }),
      signal: AbortSignal.timeout(90000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Test failed:", response.status);
      console.error(data.error || "Unknown error");
      process.exitCode = 1;
      return;
    }

    console.log("MOR AI RESPONSE:");
    console.log(data.answer || "No answer returned");

  } catch (error) {
    console.error("Connection failed:", error.message);
    process.exitCode = 1;
  }
}

testChat();
