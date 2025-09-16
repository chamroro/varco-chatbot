const express = require("express");
const cors = require("cors");
const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config();

const app = express();
const PORT = 3001;

// CORS 설정
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Hugging Face Inference Client
const hfToken = process.env.REACT_APP_HF_TOKEN || process.env.HF_TOKEN;
console.log("HF Token 설정됨:", hfToken ? "Yes" : "No");

if (!hfToken) {
  console.error("❌ Hugging Face 토큰이 설정되지 않았습니다!");
  console.error("REACT_APP_HF_TOKEN 또는 HF_TOKEN 환경변수를 설정해주세요.");
}

const hfClient = new InferenceClient(hfToken);

// 서버 상태 확인
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "VARCO 챗봇 서버가 실행 중입니다.",
    model: "NCSOFT/Llama-VARCO-8B-Instruct (featherless-ai)",
    token_configured: !!hfToken,
  });
});

// 스트리밍 채팅 엔드포인트
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { messages } = req.body;

    console.log("스트리밍 요청:", JSON.stringify(messages, null, 2));

    if (!hfToken) {
      throw new Error("Hugging Face 토큰이 설정되지 않았습니다.");
    }

    // SSE 헤더 설정
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // 스트리밍 시작
    res.write('data: {"type":"start"}\n\n');

    const stream = hfClient.chatCompletionStream({
      provider: "featherless-ai",
      model: "NCSOFT/Llama-VARCO-8B-Instruct",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices.length > 0) {
        const newContent = chunk.choices[0].delta.content;
        if (newContent) {
          fullResponse += newContent;
          // SSE 형식으로 데이터 전송
          res.write(
            `data: ${JSON.stringify({
              type: "chunk",
              content: newContent,
              fullResponse: fullResponse,
            })}\n\n`
          );
        }
      }
    }

    // 스트리밍 완료
    res.write(
      `data: ${JSON.stringify({
        type: "end",
        fullResponse: fullResponse,
      })}\n\n`
    );

    res.end();
  } catch (error) {
    console.error("스트리밍 오류:", error.message);

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: error.message,
      })}\n\n`
    );
    res.end();
  }
});

// 기존 일반 채팅 엔드포인트 (호환성을 위해 유지)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    console.log("받은 메시지:", JSON.stringify(messages, null, 2));

    if (!hfToken) {
      throw new Error("Hugging Face 토큰이 설정되지 않았습니다.");
    }

    const chatCompletion = await hfClient.chatCompletion({
      provider: "featherless-ai",
      model: "NCSOFT/Llama-VARCO-8B-Instruct",
      messages: messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    console.log("VARCO 응답:", chatCompletion);

    res.json({
      success: true,
      response: chatCompletion.choices[0].message.content,
    });
  } catch (error) {
    console.error("VARCO API 오류:", error.message);

    let errorMessage = "VARCO API와 통신 중 오류가 발생했습니다.";

    if (error.status === 401) {
      errorMessage = "인증 오류: Hugging Face 토큰을 확인해주세요.";
    } else if (error.status === 429) {
      errorMessage = "API 사용량 한도 초과: 잠시 후 다시 시도해주세요.";
    } else if (error.status === 500) {
      errorMessage = "서버 오류: VARCO 모델에 일시적인 문제가 있습니다.";
    } else if (error.message.includes("fetch")) {
      errorMessage = "네트워크 오류: 인터넷 연결을 확인해주세요.";
    } else if (error.message.includes("token")) {
      errorMessage = "토큰 오류: Hugging Face 토큰을 확인해주세요.";
    }

    res.status(500).json({
      success: false,
      error: error.message,
      message: errorMessage,
      status: error.status,
    });
  }
});

app.listen(PORT, () => {
  console.log(` VARCO 챗봇 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌐 프론트엔드: http://localhost:3000`);
  console.log(`📊 서버 상태: http://localhost:${PORT}/api/health`);
  console.log(`🤖 모델: NCSOFT/Llama-VARCO-8B-Instruct (featherless-ai)`);
  console.log(` 스트리밍: http://localhost:${PORT}/api/chat/stream`);
});
