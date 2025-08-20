import React, { useState } from 'react';

interface InputDialogProps {
  promptText: string;
  onInput: (value: string | null) => void;
  onCancel: () => void;
}

const InputDialog: React.FC<InputDialogProps> = ({ promptText, onInput, onCancel }) => {
  const [inputValue, setInputValue] = useState('');

  const handleOk = () => {
    onInput(inputValue);
  };

  const handleCancelClick = () => {
    onCancel();
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-lg">
        <p className="mb-4">{promptText}</p>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button onClick={handleOk} className="bg-blue-500 text-white px-4 py-2 rounded">OK</button>
          <button onClick={handleCancelClick} className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default InputDialog;