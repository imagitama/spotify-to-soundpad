import React from "react";
import { createRoot } from "react-dom/client";
import setupStore from "./store";
import App from "./App";

setupStore();

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);
