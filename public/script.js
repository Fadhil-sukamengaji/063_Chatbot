const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const chatMessages = document.getElementById("chat-messages");
const clearChatBtn = document.getElementById("clear-chat");

let conversationHistory = [];

clearChatBtn.addEventListener("click", () => {
    conversationHistory = [];
    chatMessages.innerHTML = `
        <div class="message-wrapper bot">
            <div class="avatar bot-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message bot-message">
                Percakapan telah dibersihkan. Ada topik baru yang ingin dibahas?
            </div>
        </div>
    `;
});

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    conversationHistory.push({ role: "user", content: text });
    appendMessage(text, "user");
    
    userInput.value = "";
    userInput.disabled = true;
    sendButton.disabled = true;

    const botMessageDiv = appendMessage("...", "bot");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: conversationHistory }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || JSON.stringify(errorData.error) || "Gagal terhubung ke server.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botReply = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.replace("data: ", "").trim();
                    if (dataStr === "[DONE]") continue;

                    try {
                        const parsedContent = JSON.parse(dataStr);
                        if (parsedContent) {
                            botReply += parsedContent;
                            botMessageDiv.textContent = botReply;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (err) {
                        // Abaikan parsing parsial
                    }
                }
            }
        }

        if (botReply) {
            conversationHistory.push({ role: "assistant", content: botReply });
        }

    } catch (error) {
        console.error("Detail Error Frontend:", error);
        botMessageDiv.textContent = "Error: " + error.message;
        botMessageDiv.style.color = "#f87171";
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
});

function appendMessage(text, sender) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper", sender);

    const avatar = document.createElement("div");
    avatar.classList.add("avatar", sender === "user" ? "user-avatar" : "bot-avatar");
    avatar.innerHTML = sender === "user" 
        ? '<i class="fa-regular fa-user"></i>' 
        : '<i class="fa-solid fa-robot"></i>';

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    messageDiv.textContent = text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(messageDiv);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}