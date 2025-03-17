importScripts("https://cdn.jsdelivr.net/pyodide/v0.23.3/full/pyodide.js");

let pyodideReady = false;
let pyodideInstance = null;

async function loadPyodideAndPackages() {
  pyodideInstance = await loadPyodide();
  await pyodideInstance.loadPackage(["micropip"]); // Load extra packages if needed
  pyodideReady = true;
}

loadPyodideAndPackages();

self.onmessage = async (event) => {
  if (!pyodideReady) {
    self.postMessage({ type: "error", data: "Python runtime is still loading..." });
    return;
  }

  const { code, userInput } = event.data;

  try {
    // Ensure userInput is defined to prevent `.replace()` error
    const safeUserInput = userInput || "";

    // Redirect input and capture output
    await pyodideInstance.runPythonAsync(`
import sys
from io import StringIO

sys.stdin = StringIO('${safeUserInput.replace(/\n/g, "\\n")}')
sys.stdout = sys.stderr = StringIO()
sys.argv = ["script.py"]  
`);

    // Execute user code
    await pyodideInstance.runPythonAsync(code);

    // Capture the output
    const output = await pyodideInstance.runPythonAsync("sys.stdout.getvalue()");

    self.postMessage({ type: "output", data: output });
  } catch (error) {
    self.postMessage({ type: "error", data: error.message });
  }
};
