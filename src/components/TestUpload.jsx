import React from 'react';

const TestUpload = () => {
  return (
    <div id="test-upload">
      <h1 className="text-gray-200 text-[30px] mb-10">Try it Out!</h1>
      <input
        type="text"
        placeholder="Upload your music file here..."
        className="bg-[#4B4B4B] text-sm flex-1
        rounded border-black border-sm inline-block mr-10 px-3 py-1 w-[350px]"
      />
      <a href="/">Scan</a>
    </div>
  );
};

export default TestUpload;
