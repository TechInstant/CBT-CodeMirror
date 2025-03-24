importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js");

async function initPyodide() {
    self.pyodide = await loadPyodide();
    postMessage({ type: "ready" });
}

initPyodide();

self.onmessage = async (event) => {
    const { code } = event.data;
    try {
        let output = await self.pyodide.runPythonAsync(code);
        postMessage({ type: "output", data: output });
    } catch (error) {
        postMessage({ type: "error", data: error.message });
    }
};
