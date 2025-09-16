import React, { useState, useRef, useEffect } from "react";
import { styled } from "@stitches/react";

const ChatContainer = styled("div", {
  width: "100%",
  maxWidth: "800px",
  height: "800px",
  background: "white",
  borderRadius: "20px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

const ChatHeader = styled("div", {
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  padding: "1rem 1.5rem",
  fontWeight: "600",
  fontSize: "1.1rem",
});

const MessagesContainer = styled("div", {
  flex: 1,
  padding: "1rem",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

const Message = styled("div", {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "1rem",

  variants: {
    isUser: {
      true: {
        justifyContent: "flex-end",
      },
      false: {
        justifyContent: "flex-start",
      },
    },
  },
});

const MessageBubble = styled("div", {
  maxWidth: "70%",
  padding: "0.75rem 1rem",
  borderRadius: "18px",
  wordWrap: "break-word",
  lineHeight: "1.4",

  variants: {
    isUser: {
      true: {
        background: "#667eea",
        color: "white",
      },
      false: {
        background: "#f1f3f4",
        color: "#333",
      },
    },
  },
});

const StreamingText = styled("span", {
  "&::after": {
    content: "▋",
    animation: "blink 1s infinite",
    color: "#667eea",
  },

  "@keyframes blink": {
    "0%, 50%": { opacity: 1 },
    "51%, 100%": { opacity: 0 },
  },
});

const InputContainer = styled("div", {
  padding: "1rem 1.5rem",
  borderTop: "1px solid #e0e0e0",
  display: "flex",
  gap: "0.5rem",
});

const MessageInput = styled("input", {
  flex: 1,
  padding: "0.75rem 1rem",
  border: "2px solid #e0e0e0",
  borderRadius: "25px",
  outline: "none",
  fontSize: "1rem",
  transition: "border-color 0.2s",

  "&:focus": {
    borderColor: "#667eea",
  },
});

const SendButton = styled("button", {
  padding: "0.75rem 1.5rem",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  border: "none",
  borderRadius: "25px",
  cursor: "pointer",
  fontWeight: "600",
  transition: "transform 0.2s",

  "&:hover": {
    transform: "translateY(-1px)",
  },

  "&:disabled": {
    opacity: "0.6",
    cursor: "not-allowed",
    transform: "none",
  },
});

const LoadingIndicator = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  color: "#666",
  fontStyle: "italic",
});

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "안녕하세요! VARCO-8B AI 챗봇입니다. 무엇을 도와드릴까요?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setIsStreaming(true);

    // 스트리밍 응답을 위한 빈 메시지 추가
    const botMessageId = Date.now() + 1;
    const botMessage = {
      id: botMessageId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, botMessage]);

    try {
      // 스트리밍 요청
      const response = await fetch("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: inputMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "chunk" && data.content) {
                // 스트리밍 텍스트 업데이트
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, text: data.fullResponse, isStreaming: true }
                      : msg
                  )
                );
              } else if (data.type === "end") {
                // 스트리밍 완료
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, text: data.fullResponse, isStreaming: false }
                      : msg
                  )
                );
                setIsStreaming(false);
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error("JSON 파싱 오류:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error calling VARCO API:", error);
      const errorMessage = {
        id: botMessageId,
        text: `죄송합니다. 오류가 발생했습니다: ${error.message}. 백엔드 서버가 실행 중인지 확인해주세요.`,
        isUser: false,
        timestamp: new Date(),
        isStreaming: false,
      };
      setMessages((prev) =>
        prev.map((msg) => (msg.id === botMessageId ? errorMessage : msg))
      );
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatHeader>🤖 VARCO-8B AI 챗봇 (스트리밍 ver)</ChatHeader>

      <MessagesContainer>
        {messages.map((message) => (
          <Message key={message.id} isUser={message.isUser}>
            <MessageBubble isUser={message.isUser}>
              {message.text}
              {message.isStreaming && <StreamingText />}
            </MessageBubble>
          </Message>
        ))}

        {isLoading && !isStreaming && (
          <Message isUser={false}>
            <LoadingIndicator>
              <span>VARCO AI가 답변을 생성하고 있습니다...</span>
            </LoadingIndicator>
          </Message>
        )}

        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <MessageInput
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          disabled={isLoading}
        />
        <SendButton
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
        >
          전송
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatBot;
