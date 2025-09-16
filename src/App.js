import React from "react";
import { styled } from "@stitches/react";
import ChatBot from "./components/ChatBot";

const AppContainer = styled("div", {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
});

const AppMain = styled("main", {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "2rem",

  "@media (max-width: 768px)": {
    padding: "1rem",
  },
});

function App() {
  return (
    <AppContainer>
      <AppMain>
        <ChatBot />
      </AppMain>
    </AppContainer>
  );
}

export default App;
