
import React, { useState } from "react";

interface InputModalProps {
  promptText: string;
  onSubmit: (value: string) => void;
}

export const InputModal: React.FC<InputModalProps> = ({ promptText, onSubmit }) => {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-80">
        <p className="mb-2">{promptText}</p>
        <input
          className="w-full border px-2 py-1 mb-4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => onSubmit(value)}
        >
          Submit
        </button>
      </div>
    </div>
  );
};
